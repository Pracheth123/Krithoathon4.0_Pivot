import datetime
from typing import List, Dict, Union

def calculate_tcfe(commit_timestamps: List[str], repo_created_at: str) -> Dict[str, Union[float, bool]]:
    """
    Calculates TCFE (Time-based Commit Frequency & Engagement) metrics:
    Continuity Score and Burst Score.
    
    :param commit_timestamps: List of ISO 8601 commit timestamp strings.
    :param repo_created_at: ISO 8601 string of repository creation date.
    :return: A dictionary representing the JSON output with metrics.
    """
    if not commit_timestamps:
        return {
            "continuity_score": 0.0,
            "burst_score": 0.0,
            "burst_detected": False
        }

    def parse_github_date(date_str: str) -> datetime.datetime:
        # Replace 'Z' with '+00:00' to cleanly parse standard GitHub ISO 8601 strings
        cleaned_str = date_str.replace("Z", "+00:00")
        return datetime.datetime.fromisoformat(cleaned_str)

    try:
        created_at_dt = parse_github_date(repo_created_at)
    except ValueError:
        created_at_dt = datetime.datetime.now(datetime.timezone.utc)
        
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    
    # Calculate Total Weeks
    delta_days = (now_dt - created_at_dt).days
    total_weeks = max(1, delta_days // 7)  # Prevent division by zero
    
    unique_weeks = set()
    parsed_commits = []
    
    for ts in commit_timestamps:
        try:
            dt = parse_github_date(ts)
            parsed_commits.append(dt)
            # Use (ISO year, ISO week number) to uniquely identify a calendar week
            unique_weeks.add((dt.isocalendar().year, dt.isocalendar().week))
        except ValueError:
            continue

    # Continuity Score
    weeks_with_commits = len(unique_weeks)
    continuity_score = min(1.0, weeks_with_commits / total_weeks)
    
    # Burst Score
    total_commits = len(parsed_commits)
    if total_commits == 0:
        burst_score = 0.0
    else:
        thirty_days_ago = now_dt - datetime.timedelta(days=30)
        recent_commits = sum(1 for dt in parsed_commits if dt >= thirty_days_ago)
        burst_score = recent_commits / total_commits
        
    burst_detected = burst_score > 0.6
    
    return {
        "continuity_score": round(continuity_score, 4),
        "burst_score": round(burst_score, 4),
        "burst_detected": burst_detected
    }
