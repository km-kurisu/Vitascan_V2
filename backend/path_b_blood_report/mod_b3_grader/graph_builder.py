"""
Mod B3 — Graph Builder
Constructs graph representations connecting normalized biomarker nodes to deficiency target nodes
for Graph Attention Network (GAT) processing.
"""
from typing import Dict, Any, List, Tuple


class BiomarkerGraphBuilder:
    """Builds graph adjacency matrices and node features from normalized biomarkers."""

    def __init__(self):
        self.biomarker_nodes = ["ferritin", "hemoglobin", "b12", "folate", "tibc", "iron", "mcv"]
        self.deficiency_nodes = ["iron", "b12", "folate", "anemia"]

    def build_graph_data(self, normalized_biomarkers: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates node feature vector and edge lists linking biomarkers to target deficiencies.
        """
        node_features = []
        biomarker_data = normalized_biomarkers.get("biomarkers", {})

        for node_key in self.biomarker_nodes:
            item = biomarker_data.get(node_key, {})
            val = item.get("value", 0.0)
            dev = item.get("deviation", 0.0)
            abnormal = 1.0 if item.get("is_abnormal", False) else 0.0
            node_features.append([val, dev, abnormal])

        # Define clinical relationship edges (Biomarker -> Deficiency)
        edges: List[Tuple[int, int]] = [
            (0, 0),  # Ferritin -> Iron deficiency
            (1, 0),  # Hemoglobin -> Iron deficiency
            (4, 0),  # TIBC -> Iron deficiency
            (5, 0),  # Iron -> Iron deficiency
            (2, 1),  # B12 -> B12 deficiency
            (6, 1),  # MCV -> B12 deficiency
            (3, 2),  # Folate -> Folate deficiency
            (1, 3),  # Hemoglobin -> Anemia
            (6, 3)   # MCV -> Anemia
        ]

        return {
            "num_biomarker_nodes": len(self.biomarker_nodes),
            "biomarker_keys": self.biomarker_nodes,
            "node_features": node_features,
            "edges": edges
        }
