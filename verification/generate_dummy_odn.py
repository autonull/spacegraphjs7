import onnx
from onnx import helper
from onnx import TensorProto
import os

def generate_model():
    # Input is a batch of 8-float vectors (2 bounding boxes: [x1,y1,x2,y2, x1,y1,x2,y2])
    boxes_input = helper.make_tensor_value_info('boxes', TensorProto.FLOAT, ['batch_size', 8])
    
    # Output is a single probability float per batch
    overlap_output = helper.make_tensor_value_info('overlap_prob', TensorProto.FLOAT, ['batch_size', 1])

    # Output a constant 1.0 to simulate high confidence of overlap
    const_node = helper.make_node(
        'Constant',
        inputs=[],
        outputs=['overlap_prob'],
        value=helper.make_tensor(
            name='const_val',
            data_type=TensorProto.FLOAT,
            dims=[1, 1],
            vals=[1.0]
        )
    )
    
    # Create the graph
    graph_def = helper.make_graph(
        [const_node],
        'dummy-odn-model',
        [boxes_input],
        [overlap_output]
    )

    # Create the model
    model_def = helper.make_model(graph_def, producer_name='dummy-generator')
    model_def.opset_import[0].version = 13

    # Save it
    os.makedirs("public", exist_ok=True)
    onnx.save(model_def, 'public/odn_model.onnx')
    print("Exported direct ONNX model to public/odn_model.onnx")

if __name__ == '__main__':
    generate_model()
