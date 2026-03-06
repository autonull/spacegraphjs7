import numpy as np
from sklearn.neural_network import MLPRegressor
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import os

# --- 1. TLA: Text Legibility Analyzer (8 features -> 1 output) ---
def train_tla():
    X = []
    y = []
    for _ in range(5000):
        bg = np.random.rand(3)
        txt = np.random.rand(3)
        size = np.random.rand(1)[0] * 30 + 10 # 10 to 40
        weight = np.random.rand(1)[0] * 500 + 300 # 300 to 800
        
        def lum(c):
            c = np.copy(c)
            c[c <= 0.03928] = c[c <= 0.03928] / 12.92
            c[c > 0.03928] = ((c[c > 0.03928] + 0.055) / 1.055) ** 2.4
            return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
            
        L1 = lum(bg)
        L2 = lum(txt)
        bright = max(L1, L2)
        dark = min(L1, L2)
        contrast = (bright + 0.05) / (dark + 0.05)
        
        is_legible = 1.0 if contrast > 4.5 else 0.0
        
        x_vec = np.concatenate([bg, txt, [size / 50.0], [weight / 1000.0]])
        X.append(x_vec)
        y.append([is_legible])
        
    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.float32)
    
    # Train
    model = MLPRegressor(hidden_layer_sizes=(16, 8), activation='relu', max_iter=200)
    model.fit(X, y.ravel())
    
    print(f"TLA Model score: {model.score(X, y.ravel()):.4f}")
    
    # Export
    initial_type = [('text_features', FloatTensorType([None, 8]))]
    onx = convert_sklearn(model, initial_types=initial_type, target_opset=13)
    
    # The output from sklearn conversion is named differently (e.g. variable), let's rename the output to match JS 
    onx.graph.output[0].name = 'legibility_score'
    for node in onx.graph.node:
        for i in range(len(node.output)):
            if node.output[i] == 'variable':
                node.output[i] = 'legibility_score'
                
    os.makedirs("public", exist_ok=True)
    with open("public/tla_model.onnx", "wb") as f:
        f.write(onx.SerializeToString())
    print("Exported TLA to public/tla_model.onnx")

# --- 2. CHE: Color Harmony Evaluator (9 features -> 1 output) ---
def train_che():
    X = []
    y = []
    for _ in range(5000):
        c1 = np.random.rand(3)
        c2 = np.random.rand(3)
        c3 = np.random.rand(3)
        
        var_r = np.var([c1[0], c2[0], c3[0]])
        var_g = np.var([c1[1], c2[1], c3[1]])
        var_b = np.var([c1[2], c2[2], c3[2]])
        total_var = var_r + var_g + var_b
        
        is_harmonious = 1.0 if total_var < 0.25 else 0.0
        
        X.append(np.concatenate([c1, c2, c3]))
        y.append([is_harmonious])
        
    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.float32)
    
    model = MLPRegressor(hidden_layer_sizes=(32, 16), activation='relu', max_iter=200)
    model.fit(X, y.ravel())
    
    print(f"CHE Model score: {model.score(X, y.ravel()):.4f}")
    
    initial_type = [('color_neighborhood', FloatTensorType([None, 9]))]
    onx = convert_sklearn(model, initial_types=initial_type, target_opset=13)
    
    onx.graph.output[0].name = 'harmony_score'
    for node in onx.graph.node:
        for i in range(len(node.output)):
            if node.output[i] == 'variable':
                node.output[i] = 'harmony_score'
                
    with open("public/che_model.onnx", "wb") as f:
        f.write(onx.SerializeToString())
    print("Exported CHE to public/che_model.onnx")

# --- 3. ODN: Overlap Detection Network (8 features -> 1 output) ---
def train_odn():
    X = []
    y = []
    # Needs more data to learn overlap reliably via bounding boxes
    for _ in range(20000): 
        box1_max = np.random.rand(2) * 1000
        box1_min = box1_max - np.random.rand(2) * 200 - 10
        box2_max = np.random.rand(2) * 1000
        box2_min = box2_max - np.random.rand(2) * 200 - 10
        
        intersect_x = (box1_min[0] < box2_max[0]) and (box1_max[0] > box2_min[0])
        intersect_y = (box1_min[1] < box2_max[1]) and (box1_max[1] > box2_min[1])
        is_overlap = 1.0 if (intersect_x and intersect_y) else 0.0
        
        b1 = np.concatenate([box1_min, box1_max]) / 1000.0
        b2 = np.concatenate([box2_min, box2_max]) / 1000.0
        
        X.append(np.concatenate([b1, b2]))
        y.append([is_overlap])
        
    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.float32)
    
    model = MLPRegressor(hidden_layer_sizes=(32, 16), activation='relu', max_iter=300)
    model.fit(X, y.ravel())
    
    print(f"ODN Model score: {model.score(X, y.ravel()):.4f}")
    
    initial_type = [('boxes', FloatTensorType([None, 8]))]
    onx = convert_sklearn(model, initial_types=initial_type, target_opset=13)
    
    onx.graph.output[0].name = 'overlap_prob'
    for node in onx.graph.node:
        for i in range(len(node.output)):
            if node.output[i] == 'variable':
                node.output[i] = 'overlap_prob'
                
    with open("public/odn_model.onnx", "wb") as f:
        f.write(onx.SerializeToString())
    print("Exported ODN to public/odn_model.onnx")

# --- 4. VHS: Visual Hierarchy Scorer (4 features -> 1 output) ---
def train_vhs():
    X = []
    y = []
    for _ in range(5000):
        # [avg_depth, max_depth, node_count, edge_count]
        avg_depth = np.random.rand() * 10
        max_depth = avg_depth + np.random.rand() * 10
        node_count = int(np.random.rand() * 1000 + 1)
        edge_count = int(np.random.rand() * 2000)
        
        # Simple heuristic: balanced depth to breadth ratio is good hierarchy
        ratio = max_depth / max(1, np.log2(node_count+1))
        # Ideal ratio around 1.0 to 3.0
        if 0.8 < ratio < 4.0 and edge_count < node_count * 3:
            clarity = 1.0
        else:
            clarity = 0.2
            
        x_vec = [avg_depth / 20.0, max_depth / 30.0, node_count / 1000.0, edge_count / 2000.0]
        X.append(x_vec)
        y.append([clarity])
        
    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.float32)
    
    model = MLPRegressor(hidden_layer_sizes=(16, 8), activation='relu', max_iter=200)
    model.fit(X, y.ravel())
    print(f"VHS Model score: {model.score(X, y.ravel()):.4f}")
    
    initial_type = [('hierarchy_features', FloatTensorType([None, 4]))]
    onx = convert_sklearn(model, initial_types=initial_type, target_opset=13)
    
    onx.graph.output[0].name = 'hierarchy_score'
    for node in onx.graph.node:
        for i in range(len(node.output)):
            if node.output[i] == 'variable':
                node.output[i] = 'hierarchy_score'
                
    with open("public/vhs_model.onnx", "wb") as f:
        f.write(onx.SerializeToString())
    print("Exported VHS to public/vhs_model.onnx")

# --- 5. EQA: Ergonomics Quality Assessor (4 features -> 1 output) ---
def train_eqa():
    X = []
    y = []
    for _ in range(5000):
        # [pct_small_targets, total_nodes, screen_width, screen_height]
        pct_small = np.random.rand()
        nodes = np.random.rand() * 1000
        w = np.random.rand() * 3000 + 320
        h = np.random.rand() * 2000 + 480
        
        # Ergonomics score depends heavily on small targets
        score = max(0.0, 1.0 - (pct_small * 1.5))
        
        x_vec = [pct_small, nodes / 1000.0, w / 4000.0, h / 3000.0]
        X.append(x_vec)
        y.append([score])
        
    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.float32)
    
    model = MLPRegressor(hidden_layer_sizes=(16, 8), activation='relu', max_iter=200)
    model.fit(X, y.ravel())
    print(f"EQA Model score: {model.score(X, y.ravel()):.4f}")
    
    initial_type = [('ergonomic_features', FloatTensorType([None, 4]))]
    onx = convert_sklearn(model, initial_types=initial_type, target_opset=13)
    
    onx.graph.output[0].name = 'fittslaw_score'
    for node in onx.graph.node:
        for i in range(len(node.output)):
            if node.output[i] == 'variable':
                node.output[i] = 'fittslaw_score'
                
    with open("public/eqa_model.onnx", "wb") as f:
        f.write(onx.SerializeToString())
    print("Exported EQA to public/eqa_model.onnx")

if __name__ == '__main__':
    train_tla()
    train_che()
    train_odn()
    train_vhs()
    train_eqa()
