import hashlib
import math
from typing import List

def text_to_embedding(text: str, dim: int = 128) -> List[float]:
    # Simple deterministic embedding based on hash; suitable for prototyping
    if not text:
        return [0.0] * dim
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()
    # Convert hex string to a list of floats in [0,1)
    nums = []
    for i in range(0, len(h), 4):
        chunk = h[i:i+4]
        if len(chunk) < 4:
            break
        val = int(chunk, 16) / float(0xFFFF)
        nums.append(val)
        if len(nums) >= dim:
            break
    # pad if needed
    if len(nums) < dim:
        nums += [0.0] * (dim - len(nums))
    return nums[:dim]
