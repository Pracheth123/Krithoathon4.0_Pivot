import httpx
import logging
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

    async def get_recent_commits(self, owner: str, repo: str, limit: int = 100) -> List[str]:
        """
        Fetch the timestamps of the last `limit` commits for a given repository.
        """
        url = f"{self.base_url}/repos/{owner}/{repo}/commits"
        params = {
            "per_page": limit
        }
        try:
            async with httpx.AsyncClient(headers=self.headers) as client:
                response = await client.get(url, params=params)
                
                if response.status_code == 404:
                    logger.warning(f"Repository {owner}/{repo} not found (or no commits).")
                    return []
                if response.status_code == 403:
                    logger.warning(f"Rate limit exceeded or access forbidden: {response.text}")
                    return []
                
                response.raise_for_status()
                commits_data = response.json()
                
                timestamps = []
                for commit in commits_data:
                    # Safely extract the commit date
                    commit_info = commit.get("commit", {})
                    author_info = commit_info.get("author", {})
                    date_str = author_info.get("date")
                    if date_str:
                        timestamps.append(date_str)
                
                return timestamps
        except httpx.RequestError as e:
            logger.error(f"An error occurred while requesting {e.request.url!r}: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error fetching commits for {owner}/{repo}: {e}")
            return []
