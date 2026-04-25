import os
import math
import httpx
from datetime import datetime, timezone, timedelta
import asyncio

async def fetch_commit_count(client: httpx.AsyncClient, handle: str, headers: dict, since_date: str = None) -> int:
    """Uses the GitHub Search API to rapidly fetch commit counts."""
    query = f"author:{handle}"
    if since_date:
        query += f" committer-date:>{since_date}"
        
    url = f"https://api.github.com/search/commits?q={query}"
    # Search Commits API requires this specific accept header
    search_headers = headers.copy()
    search_headers["Accept"] = "application/vnd.github.cloak-preview+json"
    
    try:
        response = await client.get(url, headers=search_headers)
        if response.status_code == 200:
            data = response.json()
            return data.get("total_count", 0)
        return 0
    except Exception:
        return 0

async def calculate_pow_score(github_handle: str) -> dict:
    """
    Calculates a GitHub Proof-of-Work score based on velocity and quality.
    """
    if not github_handle:
        return {
            "pow_score": 0.0,
            "velocity_component": 0.0,
            "quality_component": 0.0,
            "burst_triggered": False,
            "burst_flag": False,
            "pow_data_unavailable": True
        }

    github_token = os.getenv("GITHUB_PAT", os.getenv("GITHUB_TOKEN", ""))
    headers = {"Accept": "application/vnd.github.v3+json"}
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Fetch User Data to get created_at
        user_url = f"https://api.github.com/users/{github_handle}"
        user_res = await client.get(user_url, headers=headers)
        
        if user_res.status_code != 200:
            return {
                "pow_score": 0.0,
                "velocity_component": 0.0,
                "quality_component": 0.0,
                "burst_triggered": False,
                "burst_flag": False,
                "pow_data_unavailable": True
            }
            
        user_data = user_res.json()
        created_at_str = user_data.get("created_at")
        if not created_at_str:
            created_at_dt = datetime.now(timezone.utc)
        else:
            created_at_dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))

        now_dt = datetime.now(timezone.utc)
        account_age_days = max(1, (now_dt - created_at_dt).days)
        account_age_months = account_age_days / 30.0

        # Edge Case: Under 6 months
        under_6_months = account_age_months < 6.0

        # 2. Fetch Velocity Data via Search Commits
        date_30d = (now_dt - timedelta(days=30)).strftime("%Y-%m-%d")
        date_90d = (now_dt - timedelta(days=90)).strftime("%Y-%m-%d")

        # Run velocity API calls concurrently
        commits_all_time, commits_90d, commits_30d = await asyncio.gather(
            fetch_commit_count(client, github_handle, headers),
            fetch_commit_count(client, github_handle, headers, date_90d),
            fetch_commit_count(client, github_handle, headers, date_30d)
        )

        # Velocity Component Math
        # Historical average per 90 days
        commits_per_90d_historical_avg = (commits_all_time / account_age_days) * 90 if account_age_days > 0 else 0

        # Burst Multiplier Logic
        burst_multiplier = 1.0
        burst_triggered = False
        burst_flag = False

        if not under_6_months and account_age_months > 0:
            personal_monthly_mean = commits_all_time / account_age_months
            # Poisson standard deviation approximation
            std_dev = math.sqrt(personal_monthly_mean)
            burst_threshold = personal_monthly_mean + (2 * std_dev)

            if commits_30d > burst_threshold and commits_30d > 10:  # Require at least 10 commits to trigger burst
                burst_multiplier = 1.3
                burst_triggered = True
                burst_flag = True

        raw_velocity_ratio = commits_90d / max(commits_per_90d_historical_avg, 1)
        velocity_component = min(raw_velocity_ratio, 5.0) * burst_multiplier

        # 3. Quality Component Math
        repos_url = f"https://api.github.com/users/{github_handle}/repos?sort=updated&per_page=100"
        repos_res = await client.get(repos_url, headers=headers)
        
        quality_component = 0.0
        
        if repos_res.status_code == 200:
            repos_data = repos_res.json()
            # Filter to public non-fork repos (or forks if we want to include them, but usually primary contributions are better)
            # Edge Case: Private repositories are skipped inherently by public REST API
            valid_repos = [r for r in repos_data if not r.get("private", False) and not r.get("fork", False)]
            
            # Sort by impact (stars + forks)
            valid_repos.sort(key=lambda x: x.get("stargazers_count", 0) + x.get("forks_count", 0), reverse=True)
            top_5_repos = valid_repos[:5]
            
            total_stars = sum(r.get("stargazers_count", 0) for r in top_5_repos)
            total_forks = sum(r.get("forks_count", 0) for r in top_5_repos)
            
            # Fetch PR counts concurrently for top 5 repos
            pr_counts = [0] * len(top_5_repos)
            if top_5_repos:
                async def fetch_pr_count(repo_name):
                    # Search PRs created by others against this repo
                    pr_query = f"repo:{repo_name} is:pr -author:{github_handle}"
                    pr_url = f"https://api.github.com/search/issues?q={pr_query}"
                    try:
                        res = await client.get(pr_url, headers=headers)
                        if res.status_code == 200:
                            return res.json().get("total_count", 0)
                    except:
                        pass
                    return 0

                pr_tasks = [fetch_pr_count(r["full_name"]) for r in top_5_repos]
                pr_results = await asyncio.gather(*pr_tasks)
                total_prs = sum(pr_results)
            else:
                total_prs = 0

            composite_impact = total_stars + total_forks + total_prs
            
            # Logarithmic Normalization (capped at 500 impact = 1.0)
            if composite_impact > 0:
                quality_component = min(1.0, math.log10(composite_impact + 1) / math.log10(500))

        # 4. Final Math
        # Calculate raw pow score
        raw_pow_score = (velocity_component * 0.65) + (quality_component * 0.35)
        
        # Normalize to 0-100 scale. Max possible score = (5.0 * 1.3 * 0.65) + (1.0 * 0.35) = 4.225 + 0.35 = 4.575
        max_possible = (5.0 * 1.3 * 0.65) + (1.0 * 0.35)
        pow_score_100 = (raw_pow_score / max_possible) * 100.0
        
        return {
            "pow_score": round(min(100.0, max(0.0, pow_score_100)), 2),
            "velocity_component": round(velocity_component, 4),
            "quality_component": round(quality_component, 4),
            "burst_triggered": burst_triggered,
            "burst_flag": burst_flag,
            "pow_data_unavailable": False
        }

# For simple testing when running this file directly
if __name__ == "__main__":
    import sys
    async def main():
        handle = sys.argv[1] if len(sys.argv) > 1 else "torvalds"
        print(f"Scoring {handle}...")
        res = await calculate_pow_score(handle)
        print(res)
        
    asyncio.run(main())
