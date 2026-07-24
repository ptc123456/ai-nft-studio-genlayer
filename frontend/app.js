import { createClient, chains } from 'genlayer-js';

// Enums replicate the TypeScript definitions from the SDK
const TransactionStatus = {
  FINALIZED: 'FINALIZED',
  ACCEPTED: 'ACCEPTED',
  UNDETERMINED: 'UNDETERMINED',
  PENDING: 'PENDING',
  CANCELED: 'CANCELED'
};

const ExecutionResult = {
  FINISHED_WITH_RETURN: 'FINISHED_WITH_RETURN',
  FINISHED_WITH_ERROR: 'FINISHED_WITH_ERROR',
  NOT_VOTED: 'NOT_VOTED'
};

// Configuration
const studioChainId = '0xf22f'; // Chain ID 61999 in hex
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';
const GITHUB_URL = import.meta.env.VITE_GITHUB_URL || 'https://github.com/ptc123456/ai-nft-studio-genlayer';
const EXPLORER_URL = 'https://explorer-studio.genlayer.com/';

// Clients and State
let readClient = null;
let writeClient = null;
let userAddress = null;

// Initialize Clients and UI
window.addEventListener('DOMContentLoaded', async () => {
  // Setup read client immediately
  readClient = createClient({
    chain: chains.studionet
  });

  initUI();
  injectLinks();
  
  if (!CONTRACT_ADDRESS) {
    showElement('alert-config');
    hideElement('app-grid');
    showElement('config-badge');
    return;
  }
  
  checkWalletConnection();
});

// Overwrite all links dynamically
function injectLinks() {
  document.querySelectorAll('a').forEach(a => {
    if (a.href && a.href.includes('github.com')) {
      a.href = GITHUB_URL;
    }
    if (a.href && (a.href.includes('explorer.genlayer.com') || a.href.includes('explorer-studio'))) {
      a.href = EXPLORER_URL;
    }
  });
}

// Initialize UI Input Counters and Form Validators
function initUI() {
  const titleInput = document.getElementById('input-title');
  const promptInput = document.getElementById('input-prompt');

  if (titleInput) {
    titleInput.addEventListener('input', () => {
      const len = titleInput.value.length;
      document.getElementById('title-char-count').textContent = len;
      if (len < 2 || len > 80) {
        titleInput.classList.add('invalid-input');
      } else {
        titleInput.classList.remove('invalid-input');
        clearError('title');
      }
    });
  }

  if (promptInput) {
    promptInput.addEventListener('input', () => {
      const len = promptInput.value.length;
      document.getElementById('prompt-char-count').textContent = len;
      if (len < 20 || len > 800) {
        promptInput.classList.add('invalid-input');
      } else {
        promptInput.classList.remove('invalid-input');
        clearError('prompt');
      }
    });
  }

  // Connect Buttons
  document.getElementById('btn-connect').addEventListener('click', connectWallet);
  document.getElementById('btn-connect-alert').addEventListener('click', connectWallet);
  document.getElementById('btn-disconnect').addEventListener('click', disconnectWallet);
  
  // Submit Curate Form
  document.getElementById('form-curate').addEventListener('submit', handleCurationSubmit);
  
  // Refresh Gallery
  document.getElementById('btn-refresh-gallery').addEventListener('click', loadGallery);

  // Transfer Modal Events
  document.getElementById('btn-close-transfer').addEventListener('click', closeTransferModal);
  document.getElementById('btn-cancel-transfer').addEventListener('click', closeTransferModal);
  document.getElementById('btn-confirm-transfer').addEventListener('click', confirmTransfer);
  document.getElementById('transfer-recipient').addEventListener('input', () => {
    clearError('transfer');
  });
}

// Check wallet connection silently
async function checkWalletConnection() {
  if (typeof window.ethereum === 'undefined') {
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
      await setupConnectedWallet(accounts[0]);
    }
  } catch (err) {
    console.error('Failed to get connected accounts:', err);
  }
}

// Connect Wallet
async function connectWallet() {
  if (typeof window.ethereum === 'undefined') {
    showToast('GenLayer browser wallet extension not found.', 'error');
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts.length > 0) {
      // Check network chain
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (currentChainId !== studioChainId) {
        showToast('Switching to GenLayer Studionet network...', 'info');
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: studioChainId }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: studioChainId,
                  chainName: 'GenLayer Studionet',
                  rpcUrls: ['https://studio.genlayer.com/api'],
                  nativeCurrency: {
                    name: 'GEN',
                    symbol: 'GEN',
                    decimals: 18
                  },
                  blockExplorerUrls: ['https://explorer-studio.genlayer.com/']
                }]
              });
            } catch (addError) {
              showToast('Failed to add Studionet network to wallet.', 'error');
              return;
            }
          } else {
            showToast('Please switch your wallet to Studionet network.', 'error');
            return;
          }
        }
      }
      
      await setupConnectedWallet(accounts[0]);
      showToast('Wallet connected successfully!', 'success');
    }
  } catch (err) {
    showToast('Wallet connection failed: ' + err.message, 'error');
  }
}

// Setup Connected Wallet state
async function setupConnectedWallet(address) {
  userAddress = address;
  
  // Create write client using active provider and account address
  writeClient = createClient({
    chain: chains.studionet,
    provider: window.ethereum,
    account: userAddress
  });

  // Setup account changed listener
  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setupConnectedWallet(accounts[0]);
    }
  });

  // Setup chain changed listener
  window.ethereum.on('chainChanged', () => {
    window.location.reload();
  });

  // Update UI Elements
  document.getElementById('wallet-address').textContent = formatAddress(address);
  hideElement('btn-connect');
  hideElement('alert-connect');
  showElement('wallet-info');
  showElement('network-badge');
  showElement('app-grid');

  // Load balances, stats, and gallery
  await refreshDashboard();
}

// Disconnect Wallet
function disconnectWallet() {
  userAddress = null;
  writeClient = null;
  
  showElement('btn-connect');
  showElement('alert-connect');
  hideElement('wallet-info');
  hideElement('network-badge');
  hideElement('app-grid');
  
  showToast('Wallet disconnected.', 'info');
}

// Refresh stats, balance, and gallery
async function refreshDashboard() {
  if (!readClient || !userAddress) return;

  try {
    // 1. Balance
    const balanceWei = await readClient.getBalance({ address: userAddress });
    const balanceGen = Number(balanceWei) / 1e18;
    document.getElementById('val-balance').textContent = balanceGen.toFixed(4) + ' GEN';
    
    // 2. Contract Stats
    const totalMinted = await readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_total_minted',
      jsonSafeReturn: true
    });
    document.getElementById('val-minted').textContent = totalMinted;

    const totalSubmissions = await readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_total_submissions',
      jsonSafeReturn: true
    });
    document.getElementById('val-submissions').textContent = totalSubmissions;

    // 3. Load Gallery
    await loadGallery();
  } catch (err) {
    console.error('Failed to refresh dashboard stats:', err);
    showToast('Failed to sync on-chain data: ' + err.message, 'error');
  }
}

// Submit Curation Form
async function handleCurationSubmit(e) {
  e.preventDefault();
  
  if (!writeClient || !userAddress) {
    showToast('Please connect your wallet first.', 'error');
    return;
  }

  const title = document.getElementById('input-title').value.trim();
  const prompt = document.getElementById('input-prompt').value.trim();

  let hasError = false;

  // Validation Title
  if (!title || title.length < 2 || title.length > 80) {
    setError('title', 'Title must be between 2 and 80 characters.');
    hasError = true;
  } else {
    clearError('title');
  }

  // Validation Prompt
  if (!prompt || prompt.length < 20 || prompt.length > 800) {
    setError('prompt', 'Prompt must be between 20 and 800 characters.');
    hasError = true;
  } else {
    clearError('prompt');
  }

  if (hasError) {
    showToast('Please correct validation errors before submitting.', 'error');
    return;
  }

  // Disable form inputs
  toggleFormInputs(true);
  
  // Reset active pipeline status
  showElement('card-status');
  updatePipelineStep('submit', 'processing', 'Generating artwork...');
  updatePipelineStep('consensus', 'pending', 'Pending');
  updatePipelineStep('finalize', 'pending', 'Pending');
  document.getElementById('job-progress-bar').style.width = '10%';
  hideElement('verdict-detail');
  hideElement('revision-box');
  hideElement('generated-preview');
  document.getElementById('generated-image').removeAttribute('src');

  let phase = 'generation';

  try {
    // 1. Generate the image server-side. The Gemini key never reaches this browser.
    showToast('Gemini is generating your artwork...', 'info');
    const url = await generateArtwork(title, prompt);
    document.getElementById('generated-image').src = url;
    document.getElementById('generation-status').textContent = 'Image generated and stored securely. Confirm the GenLayer transaction to start consensus.';
    showElement('generated-preview');
    updatePipelineStep('submit', 'success', 'Image Ready');
    updatePipelineStep('consensus', 'processing', 'Confirm in wallet...');
    document.getElementById('job-progress-bar').style.width = '30%';
    showToast('Artwork generated. Please confirm the GenLayer transaction.', 'success');

    // 2. Submit the generated image URL internally to GenLayer.
    phase = 'transaction';
    const txHash = await writeClient.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'curate_and_mint',
      args: [title, prompt, url],
      value: 0n // 0 Wei value
    });

    console.log('Transaction broadcasted. Hash:', txHash);
    updatePipelineStep('consensus', 'processing', 'Consensus Active...');
    document.getElementById('job-progress-bar').style.width = '50%';
    showToast('Transaction broadcasted! Consensus active...', 'info');

    // 3. Poll Transaction Consensus Phase
    phase = 'consensus';
    let receipt = null;
    let retries = 0;
    const maxRetries = 60; // 2 minutes polling timeout
    
    while (retries < maxRetries) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        receipt = await readClient.getTransaction({ hash: txHash });
        const status = receipt.statusName || receipt.status;
        console.log('Current status:', status);

        if (status === 'PROPOSING' || status === 'COMMITTING' || status === 'REVEALING') {
          updatePipelineStep('consensus', 'processing', `Consensus Active (${status})`);
        } else if (status === TransactionStatus.FINALIZED || status === 'ACCEPTED' || status === 'READY_TO_FINALIZE') {
          break;
        } else if (status === 'CANCELED' || status === 'UNDETERMINED' || status === 'VALIDATORS_TIMEOUT' || status === 'LEADER_TIMEOUT') {
          throw new Error(`Consensus failed with state: ${status}`);
        }
      } catch (err) {
        console.warn('Polling status fetch error:', err);
      }
      retries++;
    }

    if (!receipt) {
      throw new Error('Consensus timeout reached. Please check the explorer.');
    }

    const initialStatus = receipt.statusName || receipt.status;
    if (initialStatus === 'UNDETERMINED') {
      updatePipelineStep('consensus', 'error', 'Undetermined');
      updatePipelineStep('finalize', 'error', 'Aborted');
      document.getElementById('job-progress-bar').style.width = '0%';
      showToast('Consensus ended in an UNDETERMINED state. Please retry.', 'error');
      return;
    }

    updatePipelineStep('consensus', 'success', 'Curation Completed');
    updatePipelineStep('finalize', 'processing', 'Settling transaction...');
    document.getElementById('job-progress-bar').style.width = '80%';
    showToast('Consensus completed! Settling...', 'info');

    // 4. Finalize
    phase = 'finalize';
    const finalReceipt = await readClient.waitForTransactionReceipt({
      hash: txHash,
      status: TransactionStatus.FINALIZED
    });

    console.log('Finalized receipt:', finalReceipt);
    
    const finalStatus = finalReceipt.statusName || finalReceipt.status;
    const executionResult = finalReceipt.txExecutionResultName || finalReceipt.txExecutionResult;

    if (finalStatus === TransactionStatus.FINALIZED) {
      if (executionResult === ExecutionResult.FINISHED_WITH_RETURN) {
        updatePipelineStep('finalize', 'success', 'Settled');
        document.getElementById('job-progress-bar').style.width = '100%';
        
        // Fetch Curation verdict details AFTER success confirmation
        const reviewJson = await readClient.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_latest_review',
          args: [userAddress],
          jsonSafeReturn: true
        });

        if (reviewJson) {
          const review = JSON.parse(reviewJson);
          displayCurationVerdict(review);
        } else {
          showToast('Transaction settled, but review could not be parsed.', 'warning');
        }
      } else if (executionResult === ExecutionResult.FINISHED_WITH_ERROR) {
        updatePipelineStep('finalize', 'error', 'Execution Error');
        document.getElementById('job-progress-bar').style.width = '0%';
        showToast('Transaction failed: execution reverted on-chain.', 'error');
      } else {
        updatePipelineStep('finalize', 'error', 'Incomplete');
        document.getElementById('job-progress-bar').style.width = '0%';
        showToast(`Transaction aborted with status: ${executionResult}`, 'warning');
      }
    } else if (finalStatus === 'UNDETERMINED') {
      updatePipelineStep('finalize', 'error', 'Undetermined');
      document.getElementById('job-progress-bar').style.width = '0%';
      showToast('Consensus resulted in an UNDETERMINED state. Please check contract logs.', 'error');
    } else {
      updatePipelineStep('finalize', 'error', 'Failed');
      document.getElementById('job-progress-bar').style.width = '0%';
      showToast(`Transaction ended with status: ${finalStatus}`, 'error');
    }

    // Refresh data
    await refreshDashboard();
  } catch (err) {
    console.error('Curation flow error:', err);
    if (phase === 'generation') {
      updatePipelineStep('submit', 'error', 'Generation Failed');
      updatePipelineStep('consensus', 'pending', 'Not Started');
      updatePipelineStep('finalize', 'pending', 'Not Started');
    } else if (phase === 'transaction' || phase === 'consensus') {
      updatePipelineStep('consensus', 'error', phase === 'transaction' ? 'Not Confirmed' : 'Consensus Failed');
      updatePipelineStep('finalize', 'error', 'Aborted');
    } else {
      updatePipelineStep('finalize', 'error', 'Finalization Failed');
    }
    document.getElementById('job-progress-bar').style.width = '0%';
    showToast('AI NFT pipeline failed: ' + err.message, 'error');
  } finally {
    toggleFormInputs(false);
  }
}

async function generateArtwork(title, prompt) {
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, prompt })
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Image service returned an invalid response.');
  }

  if (!response.ok) {
    throw new Error(payload?.error || 'Gemini image generation failed.');
  }

  if (!payload?.url || !payload.url.startsWith('https://') || payload.url.length > 500) {
    throw new Error('Image service did not return a valid public image URL.');
  }

  return payload.url;
}

// Display Curation Verdict details
function displayCurationVerdict(review) {
  const verdictDetail = document.getElementById('verdict-detail');
  const badge = document.getElementById('verdict-badge');
  const alignmentVal = document.getElementById('score-alignment');
  const qualityVal = document.getElementById('score-quality');
  const originalityVal = document.getElementById('score-originality');
  const safetyVal = document.getElementById('score-safety');
  const weightedVal = document.getElementById('score-weighted');
  
  const curatorReason = document.getElementById('curator-reason');
  const skepticReason = document.getElementById('skeptic-reason');
  const ethicistReason = document.getElementById('ethicist-reason');
  
  const revisionBox = document.getElementById('revision-box');
  const revisionFeedback = document.getElementById('revision-feedback');

  alignmentVal.textContent = review.alignment_score;
  qualityVal.textContent = review.quality_score;
  originalityVal.textContent = review.originality_score;
  safetyVal.textContent = review.safety_score;
  weightedVal.textContent = review.weighted_score + ' / 100';

  // Parse persona descriptions (joined by semicolon in contract)
  const reasons = review.reason.split('; ');
  let curatorText = 'Evaluating prompt alignment...';
  let skepticText = 'Analyzing originality...';
  let ethicistText = 'Verifying content safety...';

  reasons.forEach(r => {
    if (r.startsWith('Curator:')) curatorText = r.replace('Curator:', '').trim();
    if (r.startsWith('Skeptic:')) skepticText = r.replace('Skeptic:', '').trim();
    if (r.startsWith('Ethicist:')) ethicistText = r.replace('Ethicist:', '').trim();
  });

  curatorReason.textContent = curatorText;
  skepticReason.textContent = skepticText;
  ethicistReason.textContent = ethicistText;

  badge.className = 'verdict-badge';
  
  if (review.verdict === 'APPROVED') {
    badge.textContent = 'APPROVED · MINTED';
    badge.classList.add('verdict-approved');
    hideElement('revision-box');
    showToast(`Artwork Approved! Minted Token ID #${review.token_id}`, 'success');
  } else if (review.verdict === 'REVISE') {
    badge.textContent = 'REVISE REQUIRED';
    badge.classList.add('verdict-revise');
    
    // Parse revision feedback
    let feedbackText = review.revision || 'No revision feedback provided.';
    const feedbacks = feedbackText.split('; ');
    let formattedFeedback = '';
    feedbacks.forEach(f => {
      formattedFeedback += `<div style="margin-bottom: 0.25rem;">• ${f}</div>`;
    });
    
    revisionFeedback.innerHTML = formattedFeedback;
    showElement('revision-box');
    showToast('Consensus verdict: REVISE. Adjust the title or prompt and generate again.', 'warning');
  } else {
    badge.textContent = 'REJECTED';
    badge.classList.add('verdict-rejected');
    hideElement('revision-box');
    showToast('Consensus verdict: REJECTED due to safety or policy violation.', 'error');
  }

  showElement('verdict-detail');
}

// Load Gallery dynamically
async function loadGallery() {
  if (!readClient || !userAddress) return;

  const loading = document.getElementById('gallery-loading');
  const empty = document.getElementById('gallery-empty');
  const grid = document.getElementById('gallery-grid');

  showElement('gallery-loading');
  hideElement('gallery-empty');
  hideElement('gallery-grid');

  try {
    const totalMinted = Number(await readClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_total_minted',
      jsonSafeReturn: true
    }));

    grid.innerHTML = '';
    let found = 0;

    for (let i = 1; i <= totalMinted; i++) {
      try {
        const artJson = await readClient.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_artwork',
          args: [i],
          jsonSafeReturn: true
        });

        if (artJson) {
          const art = JSON.parse(artJson);
          if (art.owner.toLowerCase() === userAddress.toLowerCase()) {
            found++;
            grid.appendChild(createArtworkCard(art));
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch artwork #${i}:`, err);
      }
    }

    hideElement('gallery-loading');
    if (found === 0) {
      showElement('gallery-empty');
    } else {
      showElement('gallery-grid');
    }
  } catch (err) {
    console.error('Failed to load gallery:', err);
    hideElement('gallery-loading');
    showElement('gallery-empty');
  }
}

// Create Card Element for Gallery
function createArtworkCard(art) {
  const card = document.createElement('article');
  card.className = 'gallery-card glass';

  card.innerHTML = `
    <div class="card-image-container">
      <img src="${escapeHtml(art.artwork_url)}" alt="${escapeHtml(art.title)}" onerror="this.src='assets/cyber_astronaut.png'">
    </div>
    <div class="card-content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
        <h3 style="margin: 0; font-size: 1.05rem;">${escapeHtml(art.title)}</h3>
        <span style="font-size: 0.78rem; font-family: var(--font-mono); color: var(--accent-2); background: rgba(59, 130, 246, 0.15); padding: 0.15rem 0.45rem; border-radius: 4px;">#${art.token_id}</span>
      </div>
      <p style="font-size: 0.8rem; color: var(--muted); margin-bottom: 0.8rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${escapeHtml(art.prompt)}">
        ${escapeHtml(art.prompt)}
      </p>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-ghost btn-sm btn-view-nft" style="flex: 1; border: 1px solid var(--border); font-size: 0.78rem;">View Image</button>
        <button class="btn btn-primary btn-sm btn-transfer-trigger" style="flex: 1; font-size: 0.78rem;" data-id="${art.token_id}"><i class="fa-solid fa-share-from-square"></i> Transfer</button>
      </div>
    </div>
  `;

  // Attach button events
  card.querySelector('.btn-view-nft').addEventListener('click', () => {
    window.open(art.artwork_url, '_blank');
  });

  card.querySelector('.btn-transfer-trigger').addEventListener('click', () => {
    openTransferModal(art.token_id);
  });

  return card;
}

// Open Transfer Modal
function openTransferModal(tokenId) {
  document.getElementById('transfer-token-id').value = tokenId;
  document.getElementById('transfer-recipient').value = '';
  clearError('transfer');
  
  const modal = document.getElementById('transfer-modal');
  modal.classList.remove('hidden');
}

// Close Transfer Modal
function closeTransferModal() {
  const modal = document.getElementById('transfer-modal');
  modal.classList.add('hidden');
}

// Confirm Transfer
async function confirmTransfer() {
  if (!writeClient || !readClient || !userAddress) return;

  const tokenId = document.getElementById('transfer-token-id').value;
  const recipient = document.getElementById('transfer-recipient').value.trim();

  if (!recipient || !recipient.startsWith('0x') || recipient.length !== 42) {
    setError('transfer', 'Please enter a valid GenLayer recipient address starting with 0x (42 characters).');
    return;
  }

  // Disable modal controls
  toggleTransferControls(true);
  showToast(`Transferring Token #${tokenId}...`, 'info');

  try {
    const txHash = await writeClient.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'transfer_artwork',
      args: [Number(tokenId), recipient],
      value: 0n
    });

    console.log('Transfer broadcasted. Hash:', txHash);
    showToast('Transfer broadcasted! Waiting for finalization...', 'info');

    // Wait for finalization
    const receipt = await readClient.waitForTransactionReceipt({
      hash: txHash,
      status: TransactionStatus.FINALIZED
    });

    const status = receipt.statusName || receipt.status;
    const executionResult = receipt.txExecutionResultName || receipt.txExecutionResult;

    if (status === TransactionStatus.FINALIZED && executionResult === ExecutionResult.FINISHED_WITH_RETURN) {
      showToast('Transfer completed successfully!', 'success');
      closeTransferModal();
      await refreshDashboard();
    } else {
      throw new Error(`Transfer failed on-chain with status: ${status}, result: ${executionResult}`);
    }
  } catch (err) {
    console.error('Transfer error:', err);
    setError('transfer', 'Transfer failed: ' + err.message);
    showToast('Transfer failed: ' + err.message, 'error');
  } finally {
    toggleTransferControls(false);
  }
}

// UI Helpers
function formatAddress(address) {
  if (!address) return '';
  return address.substring(0, 6) + '...' + address.substring(address.length - 4);
}

function showElement(id) {
  document.getElementById(id).classList.remove('hidden');
}

function hideElement(id) {
  document.getElementById(id).classList.add('hidden');
}

function toggleFormInputs(disabled) {
  document.getElementById('input-title').disabled = disabled;
  document.getElementById('input-prompt').disabled = disabled;
  document.getElementById('btn-submit').disabled = disabled;
}

function toggleTransferControls(disabled) {
  document.getElementById('transfer-recipient').disabled = disabled;
  document.getElementById('btn-confirm-transfer').disabled = disabled;
  document.getElementById('btn-cancel-transfer').disabled = disabled;
  document.getElementById('btn-close-transfer').disabled = disabled;
}

function setError(field, msg) {
  const el = document.getElementById(`error-${field}`);
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
  const input = document.getElementById(`input-${field}`) || document.getElementById(`transfer-${field}`);
  if (input) {
    input.classList.add('invalid-input');
  }
}

function clearError(field) {
  const el = document.getElementById(`error-${field}`);
  if (el) {
    el.textContent = '';
    el.style.display = 'none';
  }
  const input = document.getElementById(`input-${field}`) || document.getElementById(`transfer-${field}`);
  if (input) {
    input.classList.remove('invalid-input');
  }
}

function updatePipelineStep(stepId, state, statusText) {
  const step = document.getElementById(`step-${stepId}`);
  const statusSpan = document.getElementById(`status-${stepId}`);
  
  if (!step || !statusSpan) return;

  step.classList.remove('active', 'done', 'failed');
  statusSpan.textContent = statusText;

  if (state === 'processing') {
    step.classList.add('active');
    statusSpan.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${statusText}`;
  } else if (state === 'success') {
    step.classList.add('done');
    statusSpan.innerHTML = `<i class="fa-solid fa-check"></i> ${statusText}`;
  } else if (state === 'error') {
    step.classList.add('failed');
    statusSpan.innerHTML = `<i class="fa-solid fa-xmark"></i> ${statusText}`;
  }
}

// Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '<i class="fa-solid fa-circle-info"></i>';
  if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
  if (type === 'error') icon = '<i class="fa-solid fa-circle-xmark"></i>';
  if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation"></i>';

  toast.innerHTML = `${icon} <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  // Trigger entering animation
  setTimeout(() => toast.style.opacity = '1', 10);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// Escaping inputs safely to avoid XSS
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
