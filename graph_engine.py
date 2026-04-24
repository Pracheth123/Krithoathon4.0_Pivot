import networkx as nx
from typing import List, Dict, Any

def generate_knowledge_graph(candidate_skills: List[str], jd_skills: List[str]) -> Dict[str, Any]:
    """
    Builds an undirected knowledge graph connecting a 'Candidate' node and a 
    'Job Description' node to their respective skills.
    
    Nodes are categorized into groups: 
    - "central": The Candidate and Job Description nodes.
    - "match": Skills present in both lists.
    - "candidate_only": Skills unique to the candidate.
    - "gap": Skills unique to the job description.
    
    Returns:
        A strictly typed D3.js compatible dictionary representation of the graph.
    """
    G = nx.Graph()
    
    # Add central parent nodes
    G.add_node("Candidate", group="central")
    G.add_node("Job Description", group="central")
    
    # Normalize sets to lowercase for accurate set logic
    cand_set = {s.lower() for s in candidate_skills}
    jd_set = {s.lower() for s in jd_skills}
    
    # Deduplicate while preserving original casing for frontend display
    skill_map = {s.lower(): s for s in candidate_skills + jd_skills}
    all_unique_skills = set(cand_set).union(jd_set)
    
    for skill_lower in all_unique_skills:
        display_skill = skill_map[skill_lower]
        
        if skill_lower in cand_set and skill_lower in jd_set:
            group = "match"
            G.add_node(display_skill, group=group)
            G.add_edge("Candidate", display_skill)
            G.add_edge("Job Description", display_skill)
        elif skill_lower in cand_set:
            group = "candidate_only"
            G.add_node(display_skill, group=group)
            G.add_edge("Candidate", display_skill)
        elif skill_lower in jd_set:
            group = "gap"
            G.add_node(display_skill, group=group)
            G.add_edge("Job Description", display_skill)
            
    # Serialize to standard D3.js node-link flat format
    data = nx.node_link_data(G)
    return data

def calculate_gap_analysis(candidate_skills: List[str], jd_skills: List[str]) -> Dict[str, Any]:
    """
    Performs mathematical set operations to determine overlaps, gaps, 
    extra skills, and an overall skill coverage percentage.
    
    Returns:
        A strictly typed flat dictionary with the analytical results.
    """
    # Create mapping to preserve original case
    skill_map = {s.lower(): s for s in candidate_skills + jd_skills}
    
    cand_set = {s.lower() for s in candidate_skills}
    jd_set = {s.lower() for s in jd_skills}
    
    overlaps = cand_set.intersection(jd_set)
    gaps = jd_set.difference(cand_set)
    extra_skills = cand_set.difference(jd_set)
    
    if not jd_set:
        coverage_percentage = 100.0 if cand_set else 0.0
    else:
        coverage_percentage = round((len(overlaps) / len(jd_set)) * 100.0, 2)
        
    return {
        "overlaps": [skill_map[s] for s in overlaps],
        "gaps": [skill_map[s] for s in gaps],
        "extra_skills": [skill_map[s] for s in extra_skills],
        "coverage_percentage": float(coverage_percentage)
    }
