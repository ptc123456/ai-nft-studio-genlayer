import os
import sys
from pathlib import Path
from gltest.direct.sdk_loader import setup_sdk_paths

# Resolve path to the contract to extract its dependency configuration
contract_path = Path(__file__).parent.parent / "contracts" / "registry.py"
if contract_path.exists():
    setup_sdk_paths(contract_path)
else:
    setup_sdk_paths(version="v0.2.16")

# 1. Windows-specific patch: catch PermissionError on os.unlink
orig_unlink = os.unlink

def patched_unlink(path):
    try:
        orig_unlink(path)
    except PermissionError:
        # On Windows, temp files assigned to stdin via os.dup2(fd, 0)
        # cannot be deleted while stdin is still open.
        pass

os.unlink = patched_unlink

# 2. gltest wasi_mock patch: return valid PNG image bytes for screenshot mode instead of b""
import gltest.direct.wasi_mock as wasi_mock

orig_handle_web_render = wasi_mock._handle_web_render

PNG_1x1 = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'

def patched_handle_web_render(vm, data):
    res = orig_handle_web_render(vm, data)
    if isinstance(res, dict) and "ok" in res and "image" in res["ok"]:
        if res["ok"]["image"] == b"":
            # Check if there was a mock registered with valid body
            url = data.get("url", "")
            mock_data = vm._match_web_mock(url, "GET")
            if mock_data:
                body = mock_data.get("body", b"")
                if "response" in mock_data:
                    body = mock_data["response"].get("body", b"")
                if isinstance(body, bytes):
                    res["ok"]["image"] = body
                    return res
            res["ok"]["image"] = PNG_1x1
    return res

wasi_mock._handle_web_render = patched_handle_web_render
