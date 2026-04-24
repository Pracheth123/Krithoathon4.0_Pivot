import datetime
from typing import List, Dict, Any, Union
from langchain_engine import evaluate_commit_semantics

def calculate_tcfe(commits_data: List[Dict[str, Any]], repo_created_at: str) -> Dict[str, Any]:
    """
    Calculates TCFE metrics with a 3-Pronged Anti-Cheat Layer:
    1. Biological Rate Limiting
    2. Code Impact Filter
    3. AI Semantic Scoring
    """
    if not commits_data:
        return {
            "continuity_score": 0.0,
            "burst_score": 0.0,
            "burst_detected": False,
            "bot_behavior_detected": False,
            "quality_multiplier": 1.0
        }

    def parse_github_date(date_str: str) -> datetime.datetime:
        cleaned_str = date_str.replace("Z", "+00:00")
        return datetime.datetime.fromisoformat(cleaned_str)

    try:
        created_at_dt = parse_github_date(repo_created_at)
    except ValueError:
        created_at_dt = datetime.datetime.now(datetime.timezone.utc)
        
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    
    # Pre-parse commits and sort by date
    parsed_commits = []
    for commit in commits_data:
        try:
            dt = parse_github_date(commit["date"])
            parsed_commits.append({
                "dt": dt,
                "message": commit.get("message", ""),
                "additions": commit.get("additions", 0),
                "deletions": commit.get("deletions", 0)
            })
        except (ValueError, KeyError):
            continue
            
    parsed_commits.sort(key=lambda x: x["dt"])
    
    # 1. Biological Rate Limiting
    bot_behavior_detected = False
    for i, commit in enumerate(parsed_commits):
        # Count commits within 5 minutes of this commit
        window_end = commit["dt"] + datetime.timedelta(minutes=5)
        count = 0
        for j in range(i, len(parsed_commits)):
            if parsed_commits[j]["dt"] <= window_end:
                count += 1
            else:
                break
        if count > 5:
            bot_behavior_detected = True
            break
            
    if bot_behavior_detected:
        # Short-circuit burst score if bot detected
        return {
            "continuity_score": 0.0,
            "burst_score": 0.0,
            "burst_detected": False,
            "bot_behavior_detected": True,
            "quality_multiplier": 0.0
        }

    # 2. Code Impact Filter
    valid_commits = []
    unique_weeks = set()
    for commit in parsed_commits:
        impact = commit["additions"] + commit["deletions"]
        if impact >= 5:
            valid_commits.append(commit)
            dt = commit["dt"]
            unique_weeks.add((dt.isocalendar().year, dt.isocalendar().week))

    # Continuity Score
    delta_days = (now_dt - created_at_dt).days
    total_weeks = max(1, delta_days // 7)
    weeks_with_commits = len(unique_weeks)
    continuity_score = min(1.0, weeks_with_commits / total_weeks)
    
    # Burst Score
    total_valid_commits = len(valid_commits)
    if total_valid_commits == 0:
        raw_burst_score = 0.0
    else:
        thirty_days_ago = now_dt - datetime.timedelta(days=30)
        recent_commits = sum(1 for c in valid_commits if c["dt"] >= thirty_days_ago)
        raw_burst_score = recent_commits / total_valid_commits

    # 3. Semantic Scoring
    # Get last 10 valid commit messages
    last_10_commits = valid_commits[-10:] if valid_commits else []
    messages = [c["message"] for c in last_10_commits]
    
    quality_multiplier = 1.0
    if messages:
        quality_multiplier = evaluate_commit_semantics(messages)
        
    # 4. Final Math
    adjusted_burst_score = raw_burst_score * quality_multiplier
    burst_detected = adjusted_burst_score > 0.6
    
    return {
        "continuity_score": round(continuity_score, 4),
        "burst_score": round(adjusted_burst_score, 4),
        "burst_detected": burst_detected,
        "bot_behavior_detected": bot_behavior_detected,
        "quality_multiplier": round(quality_multiplier, 4)
    }
