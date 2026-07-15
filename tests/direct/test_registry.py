import pytest
import io
import json
from genlayer import *
import PIL.Image

# Valid 1x1 transparent PNG bytes for PIL compatibility
PNG_1x1 = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'

# ─────────────────────────────────────────────────────────────────────────────
# MOCK LLM RESPONSES
# ─────────────────────────────────────────────────────────────────────────────

def get_good_llm_response():
    return {
        "curator": {
            "alignment": 90,
            "quality": 85,
            "originality": 80,
            "safety": 95,
            "reason": "Excellent artwork matching the prompt.",
            "revision": ""
        },
        "skeptic": {
            "alignment": 85,
            "quality": 80,
            "originality": 85,
            "safety": 90,
            "reason": "Original style, no generic templates.",
            "revision": ""
        },
        "ethicist": {
            "alignment": 90,
            "quality": 85,
            "originality": 80,
            "safety": 95,
            "reason": "Completely safe artwork.",
            "revision": ""
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# PYTEST DIRECT TESTS
# ─────────────────────────────────────────────────────────────────────────────

def test_approved_mint_success(direct_vm, direct_deploy):
    """Happy path: valid submission approved and minted."""
    direct_vm.check_pickling = True  # Enable pickling verification for closures
    
    contract = direct_deploy("contracts/registry.py")
    
    # Register mocks
    direct_vm.mock_web("https://example.com/art.png", {"status": 200, "body": PNG_1x1})
    direct_vm.mock_llm(".*AI NFT Art Jury.*", json.dumps(get_good_llm_response()))

    token_id = contract.curate_and_mint("Cyber Neon", "A futuristic cybernetic explorer looking at stars", "https://example.com/art.png")
    
    assert int(token_id) == 1
    assert int(contract.get_total_minted()) == 1
    assert int(contract.get_total_submissions()) == 1

    # Check review storage
    review_str = contract.get_review(u256(1))
    review = json.loads(review_str)
    assert review["verdict"] == "APPROVED"
    assert review["title"] == "Cyber Neon"
    assert review["token_id"] == 1

    # Check owner
    artwork_str = contract.get_artwork(u256(1))
    artwork = json.loads(artwork_str)
    assert artwork["owner"] == direct_vm.sender.as_hex


def test_address_normalization_edge_cases(direct_vm, direct_deploy, direct_bob):
    """ensure_address should handle Address, int, bytes, hex string, and reject invalid types."""
    contract = direct_deploy("contracts/registry.py")

    # Get the raw bytes and expected hex representation of bob
    if isinstance(direct_bob, Address):
        bob_bytes = direct_bob.as_bytes
        expected_hex = direct_bob.as_hex
    else:
        bob_bytes = direct_bob
        expected_hex = Address(direct_bob).as_hex

    # Test bytes conversion
    assert contract.ensure_address(bob_bytes).as_hex == expected_hex

    # Test hex strings conversion
    hex_with_0x = expected_hex
    hex_without_0x = hex_with_0x[2:]
    assert contract.ensure_address(hex_with_0x).as_hex == expected_hex
    assert contract.ensure_address(hex_without_0x).as_hex == expected_hex

    # Test integer conversion
    int_addr = int.from_bytes(bob_bytes, byteorder="big")
    assert contract.ensure_address(int_addr).as_hex == expected_hex

    # Invalid string length
    with pytest.raises(Exception) as excinfo:
        contract.ensure_address("0x123")
    assert "Invalid address string" in str(excinfo.value)

    # Invalid type
    with pytest.raises(Exception) as excinfo:
        contract.ensure_address([1, 2, 3])
    assert "Invalid address type" in str(excinfo.value)


def test_duplicate_mint_blocked(direct_vm, direct_deploy):
    """Already minted image URLs are blocked immediately."""
    contract = direct_deploy("contracts/registry.py")
    
    direct_vm.mock_web("https://example.com/art.png", {"status": 200, "body": PNG_1x1})
    direct_vm.mock_llm(".*Art Jury.*", json.dumps(get_good_llm_response()))

    contract.curate_and_mint("Cyber Neon", "A futuristic cybernetic explorer looking at stars", "https://example.com/art.png")
    
    with direct_vm.expect_revert("Artwork URL has already been minted"):
        contract.curate_and_mint("Cyber Neon 2", "A futuristic cybernetic explorer looking at stars", "https://example.com/art.png")


def test_transfer_unauthorized_and_success(direct_vm, direct_deploy, direct_bob):
    """Only token owners can transfer their artwork; unauthorized transfers revert."""
    contract = direct_deploy("contracts/registry.py")
    
    # Mint a token first
    direct_vm.mock_web("https://example.com/art.png", {"status": 200, "body": PNG_1x1})
    direct_vm.mock_llm(".*Art Jury.*", json.dumps(get_good_llm_response()))
    contract.curate_and_mint("Cyber Neon", "A futuristic cybernetic explorer looking at stars", "https://example.com/art.png")

    # Bob tries to transfer (should fail)
    with direct_vm.expect_revert("Caller is not the owner"):
        with direct_vm.prank(direct_bob):
            # Pass direct_bob (bytes/Address) directly
            if isinstance(direct_bob, Address):
                recipient = direct_bob.as_bytes
            else:
                recipient = direct_bob
            contract.transfer_artwork(u256(1), recipient)

    # Owner transfers to Bob (should succeed)
    if isinstance(direct_bob, Address):
        recipient = direct_bob.as_bytes
    else:
        recipient = direct_bob
    contract.transfer_artwork(u256(1), recipient)
    
    # Check new owner
    artwork_str = contract.get_artwork(u256(1))
    artwork = json.loads(artwork_str)
    assert artwork["owner"] == Address(direct_bob).as_hex


def test_web_render_error(direct_vm, direct_deploy):
    """Web rendering exceptions revert the transaction with gl.vm.UserError."""
    contract = direct_deploy("contracts/registry.py")
    
    # Do not register web mock -> will cause mock not found or render exception
    with direct_vm.expect_revert("Curation error: web_render_fail"):
        contract.curate_and_mint("Cyber Neon", "A futuristic cybernetic explorer looking at stars", "https://example.com/dead.png")


def test_empty_evidence_error(direct_vm, direct_deploy):
    """Empty rendered image bytes revert the transaction with gl.vm.UserError."""
    contract = direct_deploy("contracts/registry.py")
    
    # Register mock returning empty body
    direct_vm.mock_web("https://example.com/empty.png", {"status": 200, "body": b""})
    
    # Patch PIL.Image.open to allow b"" raw bytes to pass the decoder phase without throwing UnidentifiedImageError
    orig_open = PIL.Image.open
    PIL.Image.open = lambda *args, **kwargs: orig_open(io.BytesIO(PNG_1x1))

    try:
      with direct_vm.expect_revert("Curation error: empty_evidence"):
          contract.curate_and_mint("Cyber Neon", "A futuristic cybernetic explorer looking at stars", "https://example.com/empty.png")
    finally:
      PIL.Image.open = orig_open


def test_oversized_evidence_error(direct_vm, direct_deploy):
    """Rendered evidence size exceeding 10MB reverts the transaction."""
    contract = direct_deploy("contracts/registry.py")
    
    # Mocking oversized image bytes
    oversized_body = b"X" * (10 * 1024 * 1024 + 1)
    direct_vm.mock_web("https://example.com/big.png", {"status": 200, "body": oversized_body})
    
    # Patch PIL.Image.open to allow oversized raw bytes to pass the decoder phase without throwing UnidentifiedImageError
    orig_open = PIL.Image.open
    PIL.Image.open = lambda *args, **kwargs: orig_open(io.BytesIO(PNG_1x1))

    try:
      with direct_vm.expect_revert("Curation error: oversized_evidence"):
          contract.curate_and_mint("Cyber Neon", "A futuristic cybernetic explorer looking at stars", "https://example.com/big.png")
    finally:
      PIL.Image.open = orig_open


def test_llm_malformed_json_error(direct_vm, direct_deploy):
    """Malformed LLM JSON reverts the transaction."""
    contract = direct_deploy("contracts/registry.py")
    
    direct_vm.mock_web("https://example.com/art.png", {"status": 200, "body": PNG_1x1})
    # Mocking bad JSON response
    direct_vm.mock_llm(".*Art Jury.*", "invalid-json-string{]}")

    with direct_vm.expect_revert("Curation error: malformed_json"):
        contract.curate_and_mint("Cyber Neon", "A futuristic cybernetic explorer looking at stars", "https://example.com/art.png")


def test_llm_missing_persona_error(direct_vm, direct_deploy):
    """Missing Curator/Skeptic/Ethicist persona in LLM response reverts transaction."""
    contract = direct_deploy("contracts/registry.py")
    
    direct_vm.mock_web("https://example.com/art.png", {"status": 200, "body": PNG_1x1})
    # Response missing Ethicist
    bad_response = {
        "curator": get_good_llm_response()["curator"],
        "skeptic": get_good_llm_response()["skeptic"]
    }
    direct_vm.mock_llm(".*Art Jury.*", json.dumps(bad_response))

    with direct_vm.expect_revert("Curation error: missing_persona"):
        contract.curate_and_mint("Cyber Neon", "A futuristic cybernetic explorer looking at stars", "https://example.com/art.png")


def test_llm_non_numeric_score_error(direct_vm, direct_deploy):
    """Non-numeric scores or out-of-range scores revert the transaction."""
    contract = direct_deploy("contracts/registry.py")
    
    direct_vm.mock_web("https://example.com/art.png", {"status": 200, "body": PNG_1x1})
    # Curator has string "invalid" for alignment
    bad_response = get_good_llm_response()
    bad_response["curator"]["alignment"] = "invalid"
    direct_vm.mock_llm(".*Art Jury.*", json.dumps(bad_response))

    with direct_vm.expect_revert("Curation error: invalid_score"):
        contract.curate_and_mint("Cyber Neon", "A futuristic cybernetic explorer looking at stars", "https://example.com/art.png")


def test_pickling_safety_closures(direct_vm, direct_deploy):
    """Closure variable capture is clean and does not capture self storage (pickling safe)."""
    direct_vm.check_pickling = True
    
    contract = direct_deploy("contracts/registry.py")
    direct_vm.mock_web("https://example.com/art.png", {"status": 200, "body": PNG_1x1})
    direct_vm.mock_llm(".*Art Jury.*", json.dumps(get_good_llm_response()))

    # Should run successfully without raising pickling runtime warning or errors
    token_id = contract.curate_and_mint("Cyber Neon", "A futuristic cybernetic explorer looking at stars", "https://example.com/art.png")
    assert int(token_id) == 1


def test_validator_fn_semantic_rules(direct_vm, direct_deploy):
    """The validator_fn enforces alignment, safety, weighted score, and verdict rules."""
    contract = direct_deploy("contracts/registry.py")
    
    # Trigger a run to capture the validator_fn
    direct_vm.mock_web("https://example.com/art.png", {"status": 200, "body": PNG_1x1})
    direct_vm.mock_llm(".*Art Jury.*", json.dumps(get_good_llm_response()))
    contract.curate_and_mint("Cyber Neon", "A futuristic cybernetic explorer looking at stars", "https://example.com/art.png")

    # Run the validator directly on valid results
    # We pass Return object using run_validator
    assert direct_vm.run_validator(leader_result=get_good_llm_response()) is False
    
    good_agg = {
        "verdict": "APPROVED",
        "alignment": 90,
        "quality": 85,
        "originality": 80,
        "safety": 95,
        "weighted_score": 87, # (90*35 + 85*25 + 80*20 + 95*20) // 100 = 87
        "reason": "Curator: OK; Skeptic: OK",
        "revision": ""
    }
    assert direct_vm.run_validator(leader_result=good_agg) is True

    # Bad weighted calculation
    bad_weighted = {**good_agg, "weighted_score": 10}
    assert direct_vm.run_validator(leader_result=bad_weighted) is False

    # Inconsistent verdict (weighted score < 70 should be REVISE)
    inconsistent = {**good_agg, "alignment": 40, "verdict": "APPROVED"} # alignment < 55 must be REVISE
    assert direct_vm.run_validator(leader_result=inconsistent) is False


def test_validator_is_completely_deterministic(direct_vm, direct_deploy):
    """The validator_fn does not invoke any non-deterministic methods (strict mock mode validation)."""
    contract = direct_deploy("contracts/registry.py")
    
    # Trigger a run to capture the validator_fn
    direct_vm.mock_web("https://example.com/art.png", {"status": 200, "body": PNG_1x1})
    direct_vm.mock_llm(".*Art Jury.*", json.dumps(get_good_llm_response()))
    contract.curate_and_mint("Cyber Neon", "A futuristic cybernetic explorer looking at stars", "https://example.com/art.png")

    good_agg = {
        "verdict": "APPROVED",
        "alignment": 90,
        "quality": 85,
        "originality": 80,
        "safety": 95,
        "weighted_score": 87,
        "reason": "Curator: OK; Skeptic: OK; Ethicist: OK",
        "revision": ""
    }
    
    # Enable strict mock mode: any non-deterministic call (like web rendering or LLM prompt execution)
    # that is not explicitly mocked will throw MockNotFoundError.
    # Since our validator_fn is strictly deterministic, it should execute and return True without throwing.
    direct_vm._strict_mock_mode = True
    assert direct_vm.run_validator(leader_result=good_agg) is True


def test_low_alignment_returns_revise_without_mint(direct_vm, direct_deploy):
    """Low alignment (< 55) triggers REVISE verdict and does NOT mint an NFT."""
    contract = direct_deploy("contracts/registry.py")
    
    # Register web and LLM mocks
    direct_vm.mock_web("https://example.com/art.png", {"status": 200, "body": PNG_1x1})
    
    # alignment = 50 (< 55)
    revise_response = {
        "curator": {
            "alignment": 50,
            "quality": 85,
            "originality": 80,
            "safety": 95,
            "reason": "Art does not fully align with the cyber planet prompt details.",
            "revision": "Include planetary visual cues."
        },
        "skeptic": {
            "alignment": 50,
            "quality": 80,
            "originality": 85,
            "safety": 90,
            "reason": "Style is fine, but alignment is off.",
            "revision": ""
        },
        "ethicist": {
            "alignment": 50,
            "quality": 85,
            "originality": 80,
            "safety": 95,
            "reason": "Safe but low alignment.",
            "revision": ""
        }
    }
    
    direct_vm.mock_llm(".*Art Jury.*", json.dumps(revise_response))

    token_id = contract.curate_and_mint("Cyber Neon", "A futuristic cybernetic explorer looking at stars", "https://example.com/art.png")
    
    assert int(token_id) == 0
    assert int(contract.get_total_minted()) == 0
    assert int(contract.get_total_submissions()) == 1

    # Check review storage still saved the review
    review_str = contract.get_review(u256(1))
    review = json.loads(review_str)
    assert review["verdict"] == "REVISE"
    assert review["title"] == "Cyber Neon"
    assert review["token_id"] == 0
    assert "Include planetary visual cues" in review["revision"]


def test_unsafe_artwork_returns_rejected_without_mint(direct_vm, direct_deploy):
    """Low safety (< 70) triggers REJECTED verdict and does NOT mint an NFT."""
    contract = direct_deploy("contracts/registry.py")
    
    # Register web and LLM mocks
    direct_vm.mock_web("https://example.com/art.png", {"status": 200, "body": PNG_1x1})
    
    # safety = 60 (< 70)
    rejected_response = {
        "curator": {
            "alignment": 90,
            "quality": 85,
            "originality": 80,
            "safety": 60,
            "reason": "High quality but safety concerns.",
            "revision": ""
        },
        "skeptic": {
            "alignment": 90,
            "quality": 80,
            "originality": 85,
            "safety": 60,
            "reason": "Contains slightly unsafe elements.",
            "revision": ""
        },
        "ethicist": {
            "alignment": 90,
            "quality": 85,
            "originality": 80,
            "safety": 60,
            "reason": "Violates basic visual standards.",
            "revision": ""
        }
    }
    
    direct_vm.mock_llm(".*Art Jury.*", json.dumps(rejected_response))

    token_id = contract.curate_and_mint("Cyber Neon", "A futuristic cybernetic explorer looking at stars", "https://example.com/art.png")
    
    assert int(token_id) == 0
    assert int(contract.get_total_minted()) == 0
    assert int(contract.get_total_submissions()) == 1

    # Check review storage still saved the review
    review_str = contract.get_review(u256(1))
    review = json.loads(review_str)
    assert review["verdict"] == "REJECTED"
    assert review["title"] == "Cyber Neon"
    assert review["token_id"] == 0
    assert review["safety_score"] == 60

