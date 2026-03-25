import onnx
from onnx import helper
from onnx import TensorProto
import os

def generate_tla_model():
    # Input is a batch of 8-float vectors (Simulating a cropped tensor of the text node or [r,g,b, text_r, text_g, text_b, size, weight])
    tla_input = helper.make_tensor_value_info('text_features', TensorProto.FLOAT, ['batch_size', 8])
    
    # Output is a single probability float per batch (1.0 = Legible, 0.0 = Illegible)
    tla_output = helper.make_tensor_value_info('legibility_score', TensorProto.FLOAT, ['batch_size', 1])

    # Output a constant 0.1 to simulate that the model agrees the text is Illegible (WCAG violation)
    const_node = helper.make_node(
        'Constant',
        inputs=[],
        outputs=['legibility_score'],
        value=helper.make_tensor(
            name='const_val',
            data_type=TensorProto.FLOAT,
            dims=[1, 1],
            vals=[0.1]
        )
    )
    
    # Create the graph
    graph_def = helper.make_graph(
        [const_node],
        'dummy-tla-model',
        [tla_input],
        [tla_output]
    )

    # Create the model
    model_def = helper.make_model(graph_def, producer_name='dummy-generator')
    model_def.opset_import[0].version = 13

    # Save it
    os.makedirs("public", exist_ok=True)
    onnx.save(model_def, 'public/tla_model.onnx')
    print("Exported direct ONNX model to public/tla_model.onnx")

def generate_che_model():
    # Input is a batch of 9-float vectors (Simulating [r1,g1,b1, r2,g2,b2, r3,g3,b3] of local neighborhood)
    che_input = helper.make_tensor_value_info('color_neighborhood', TensorProto.FLOAT, ['batch_size', 9])
    
    # Output is a single probability float per batch (1.0 = Harmonious, 0.0 = Clashing)
    che_output = helper.make_tensor_value_info('harmony_score', TensorProto.FLOAT, ['batch_size', 1])

    # Output a constant 0.2 to simulate that the model agrees colors clash
    const_node = helper.make_node(
        'Constant',
        inputs=[],
        outputs=['harmony_score'],
        value=helper.make_tensor(
            name='const_val',
            data_type=TensorProto.FLOAT,
            dims=[1, 1],
            vals=[0.2]
        )
    )
    
    # Create the graph
    graph_def = helper.make_graph(
        [const_node],
        'dummy-che-model',
        [che_input],
        [che_output]
    )

    # Create the model
    model_def = helper.make_model(graph_def, producer_name='dummy-generator')
    model_def.opset_import[0].version = 13

    # Save it
    os.makedirs("public", exist_ok=True)
    onnx.save(model_def, 'public/che_model.onnx')
    print("Exported direct ONNX model to public/che_model.onnx")

if __name__ == '__main__':
    generate_tla_model()
    generate_che_model()
