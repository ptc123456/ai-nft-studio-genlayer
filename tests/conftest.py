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
