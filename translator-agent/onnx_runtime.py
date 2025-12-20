import numpy as np
import onnxruntime


SUPPORTED_SAMPLE_RATES = [8000, 16000]


def new_inference_session(force_cpu: bool) -> onnxruntime.InferenceSession:
    # Use a more reliable path resolution for the ONNX model
    import os

    current_dir = os.path.dirname(os.path.abspath(__file__))
    print("ankit->", current_dir)
    model_path = os.path.join(current_dir, "silero_vad.onnx")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Silero VAD model not found at: {model_path}")

    path = model_path

    opts = onnxruntime.SessionOptions()
    opts.add_session_config_entry("session.intra_op.allow_spinning", "0")
    opts.add_session_config_entry("session.inter_op.allow_spinning", "0")
    opts.inter_op_num_threads = 1
    opts.intra_op_num_threads = 1
    opts.execution_mode = onnxruntime.ExecutionMode.ORT_SEQUENTIAL

    if force_cpu and "CPUExecutionProvider" in onnxruntime.get_available_providers():
        session = onnxruntime.InferenceSession(
            path, providers=["CPUExecutionProvider"], sess_options=opts
        )
    else:
        session = onnxruntime.InferenceSession(path, sess_options=opts)

    return session


class OnnxModel:
    def __init__(
        self, *, onnx_session: onnxruntime.InferenceSession, sample_rate: int
    ) -> None:
        self._sess = onnx_session
        self._sample_rate = sample_rate

        if sample_rate not in SUPPORTED_SAMPLE_RATES:
            raise ValueError("Silero VAD only supports 8KHz and 16KHz sample rates")

        if sample_rate == 8000:
            self._window_size_samples = 256
            self._context_size = 32
        elif sample_rate == 16000:
            self._window_size_samples = 512
            self._context_size = 64

        self._sample_rate_nd = np.array(sample_rate, dtype=np.int64)
        self._context = np.zeros((1, self._context_size), dtype=np.float32)
        self._rnn_state = np.zeros((2, 1, 128), dtype=np.float32)
        self._input_buffer = np.zeros(
            (1, self._context_size + self._window_size_samples), dtype=np.float32
        )

    @property
    def sample_rate(self) -> int:
        return self._sample_rate

    @property
    def window_size_samples(self) -> int:
        return self._window_size_samples

    @property
    def context_size(self) -> int:
        return self._context_size

    def __call__(self, x: np.ndarray) -> float:
        self._input_buffer[:, : self._context_size] = self._context
        self._input_buffer[:, self._context_size :] = x

        ort_inputs = {
            "input": self._input_buffer,
            "state": self._rnn_state,
            "sr": self._sample_rate_nd,
        }
        out, self._state = self._sess.run(None, ort_inputs)
        self._context = self._input_buffer[:, -self._context_size :]
        return out.item()
