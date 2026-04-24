import httpx
import logging
import asyncio
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class GitHubExtractor:
    """
    An asynchronous client to extract public GitHub user and repository data.
    """
    def __init__(self, token: str = None):
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
        }
        # Include token if available to increase rate limits
        if token:
            self.headers["Authorization"] = f"token {token}"

    async def get_top_repositories(self, username: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Fetch a user's top public repositories.
        """
        url = f"{self.base_url}/users/{username}/repos"
        params = {
            "type": "owner",
            "sort": "updated",
            "per_page": limit,
        }
        try:
            async with httpx.AsyncClient(headers=self.headers) as client:
                response = await client.get(url, params=params)
                
                if response.status_code == 404:
                    logger.warning(f"User {username} not found.")
                    return []
                if response.status_code == 403:
                    logger.warning(f"Rate limit exceeded or access forbidden: {response.text}")
                    return []
                
                response.raise_for_status()
                return response.json()
        except httpx.RequestError as e:
            logger.error(f"An error occurred while requesting {e.request.url!r}: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error fetching repositories for {username}: {e}")
            return []

    async def get_language_distribution(self, owner: str, repo: str) -> Dict[str, int]:
        """
        Fetch the language distribution (in bytes) for a given repository.
        """
        url = f"{self.base_url}/repos/{owner}/{repo}/languages"
        try:
            async with httpx.AsyncClient(headers=self.headers) as client:
                response = await client.get(url)
                
                if response.status_code == 404:
                    logger.warning(f"Repository {owner}/{repo} not found.")
                    return {}
                if response.status_code == 403:
                    logger.warning(f"Rate limit exceeded or access forbidden: {response.text}")
                    return {}
                
                response.raise_for_status()
                return response.json()
        except httpx.RequestError as e:
            logger.error(f"An error occurred while requesting {e.request.url!r}: {e}")
            return {}
        except Exception as e:
            logger.error(f"Unexpected error fetching languages for {owner}/{repo}: {e}")
            return {}

    async def _fetch_commit_details(self, client: httpx.AsyncClient, owner: str, repo: str, sha: str) -> Dict[str, Any]:
        url = f"{self.base_url}/repos/{owner}/{repo}/commits/{sha}"
        try:
            response = await client.get(url)
            if response.status_code == 200:
                return response.json()
        except Exception:
            pass
        return {}

    async def get_recent_commits(self, owner: str, repo: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Fetch the details of the last `limit` commits for a given repository.
        Returns a list of dicts with date, message, additions, deletions.
        """
        url = f"{self.base_url}/repos/{owner}/{repo}/commits"
        params = {
            "per_page": limit
        }
        try:
            async with httpx.AsyncClient(headers=self.headers) as client:
                response = await client.get(url, params=params)
                
                if response.status_code in (404, 403):
                    logger.warning(f"Error {response.status_code} fetching commits: {response.text}")
                    return []
                
                response.raise_for_status()
                commits_data = response.json()
                
                # Fetch detailed stats for each commit concurrently
                tasks = [
                    self._fetch_commit_details(client, owner, repo, commit["sha"])
                    for commit in commits_data if "sha" in commit
                ]
                detailed_commits = await asyncio.gather(*tasks)
                
                results = []
                for commit, detailed in zip(commits_data, detailed_commits):
                    commit_info = commit.get("commit", {})
                    author_info = commit_info.get("author", {})
                    date_str = author_info.get("date")
                    message = commit_info.get("message", "")
                    
                    stats = detailed.get("stats", {})
                    additions = stats.get("additions", 0)
                    deletions = stats.get("deletions", 0)
                    
                    if date_str:
                        results.append({
                            "date": date_str,
                            "message": message,
                            "additions": additions,
                            "deletions": deletions
                        })
                
                return results
        except httpx.RequestError as e:
            logger.error(f"An error occurred while requesting {e.request.url!r}: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error fetching commits for {owner}/{repo}: {e}")
            return []
