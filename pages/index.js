// pages/index.js
import Head from 'next/head';
import { allowedUsers } from '../allowlist';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useContractWrite,
  useContractRead,
  usePrepareContractWrite,
  useWaitForTransaction,
} from 'wagmi';
import { erc20ABI } from 'wagmi';
import toast from 'react-hot-toast';
import usdecAbi from '../usdecAbi.json';

const USDEC_ADDRESS = '0x2FA67413F8D689EE7472aFcF932C771a94519A54';
const BASE_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// enforce Arcadia's 10 USDC minimum after 1% fee → input must be ≥ 11
const MIN_USDC_INPUT = 11;
const MAX_USDC_INPUT = 500;

export default function Home() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [hasApproved, setHasApproved] = useState(false);

  // Mint flow state
  const parsedAmount = parseFloat(amount);
  const isValidAmount =
    !isNaN(parsedAmount) &&
    parsedAmount >= MIN_USDC_INPUT &&
    parsedAmount <= MAX_USDC_INPUT;
  const isAllowed = address ? allowedUsers.includes(address.toLowerCase()) : false;
  const fullAmount = isValidAmount
    ? BigInt(Math.floor(parsedAmount * 1e6))
    : undefined;

  // Redeem flow state
  const parsedRedeem = parseFloat(redeemAmount);
  const isValidRedeem = !isNaN(parsedRedeem) && parsedRedeem > 0;
  const redeemValue = isValidRedeem
    ? BigInt(Math.floor(parsedRedeem * 1e6))
    : undefined;

  // Approval (USDC → USDEC contract)
  const { config: approveConfig } = usePrepareContractWrite({
    address: BASE_USDC_ADDRESS,
    abi: erc20ABI,
    functionName: 'approve',
    args: fullAmount ? [USDEC_ADDRESS, fullAmount] : undefined,
    enabled: isConnected && isValidAmount && isAllowed,
  });
  const {
    write: approveWrite,
    data: approveData,
    isLoading: isApproving,
    isSuccess: approveSuccess,
  } = useContractWrite({
    ...approveConfig,
    onSuccess() {
      toast.success('Approval sent!');
    },
    onError(error) {
      toast.error('Approval failed: ' + error.message);
    },
  });
  useWaitForTransaction({
    hash: approveData?.hash,
    onSuccess() {
      setHasApproved(true);
      toast.success('Approval confirmed!');
    },
  });

  // ── RECKLESS MINT (skip static simulation) ──
  const {
    write: mintWrite,
    isLoading: isMinting,
    data: mintData,
  } = useContractWrite({
    mode: 'recklesslyUnprepared',
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'mint',
    args: fullAmount ? [fullAmount] : undefined,
    onError(error) {
      toast.error('Mint failed: ' + error.message);
    },
    onSuccess(data) {
      setTxHash(data.hash);
      toast.success('Mint tx sent!');
      setAmount('');
      setHasApproved(false);
    },
  });
  useWaitForTransaction({
    hash: mintData?.hash,
    onSuccess() {
      toast.success('Mint confirmed!');
    },
  });

  // Redeem (withdraw → fee → transfer back)
  const { config: redeemConfig } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'redeem',
    args: redeemValue ? [redeemValue] : undefined,
    enabled: isConnected && isValidRedeem,
  });
  const { write: redeemWrite, isLoading: isRedeeming } = useContractWrite({
    ...redeemConfig,
    onSuccess(data) {
      setTxHash(data.hash);
      toast.success('Redeemed!');
      setRedeemAmount('');
    },
    onError(error) {
      toast.error('Redemption failed: ' + error.message);
    },
  });

  // Read on-chain balances
  const usdcBalance = useContractRead({
    address: BASE_USDC_ADDRESS,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: isConnected,
    watch: true,
  }).data ?? 0n;
  const usdecBalance = useContractRead({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'balanceOf',
    args: [address],
    enabled: isConnected,
    watch: true,
  }).data ?? 0n;
  const unlockedBalance = useContractRead({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'unlockedBalance',
    args: [address],
    enabled: isConnected,
    watch: true,
  }).data ?? 0n;

  const displayUSDC = (Number(usdcBalance) / 1e6).toFixed(2);
  const displayUSDEC = (Number(usdecBalance) / 1e6).toFixed(4);
  const displayUnlocked = (Number(unlockedBalance) / 1e6).toFixed(4);

  useEffect(() => {
    if (approveSuccess) setHasApproved(true);
  }, [approveSuccess]);
  useEffect(() => {
    setHasApproved(false);
  }, [amount]);

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>USDEC – A Stablecoin Built for the Creator Economy</title>
        <link rel="icon" href="/favicon.png" />
      </Head>
      <div
        className="min-h-screen bg-cover bg-center p-4"
        style={{ backgroundImage: "url('/koru-bg-wide.png')" }}
      >
        {/* Logo & Timer */}
        <div className="flex flex-col items-center mt-6 mb-4 bg-black bg-opacity-60 p-4 rounded-xl">
          <Image src="/usdec-logo-gold.png" alt="USDEC Logo" width={180} height={180} />
          <p className="text-xs text-gray-200 italic mb-2">
            ⏳ redeemable 30 days from mint
          </p>
        </div>

        {/* Mint Section */}
        <div className="bg-white bg-opacity-90 shadow-xl rounded-2xl p-6 w-full max-w-sm text-center mb-6">
          <ConnectButton />
          {isConnected && (
            <>
              {!isAllowed ? (
                <div className="text-red-600 text-sm font-semibold mb-4">
                  🚫 You are not allowlisted to mint USDEC.
                  <br />
                  Become a paid Substack member to unlock access.
                </div>
              ) : (
                <>
                  <input
                    id="usdc-amount"
                    name="usdc-amount"
                    type="number"
                    placeholder={`Amount (Min ${MIN_USDC_INPUT} USDC, Max ${MAX_USDC_INPUT} USDC | You have ${displayUSDC})`}
                    value={amount}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v);
                    }}
                    className="w-full p-2 border border-gray-300 rounded mb-2"
                  />
                  {parsedAmount > 0 && parsedAmount < MIN_USDC_INPUT && (
                    <div className="text-red-600 text-sm mb-2">
                      Minimum of {MIN_USDC_INPUT} USDC required to satisfy Arcadia’s 10 USDC vault minimum.
                    </div>
                  )}
                  {isValidAmount && (
                    <p className="text-sm text-gray-700 mb-2 font-semibold">
                      Fee: {(parsedAmount * 0.01).toFixed(2)} USDC • Vault: {(parsedAmount * 0.99).toFixed(2)} USDC
                    </p>
                  )}

                  {!hasApproved ? (
                    <button
                      onClick={() => approveWrite?.()}
                      disabled={!approveWrite || isApproving || !isValidAmount}
                      className={`w-full p-2 mb-2 rounded text-white ${
                        !approveWrite || isApproving || !isValidAmount
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-yellow-600 hover:bg-yellow-700'
                      }`}
                    >
                      {isApproving ? 'Approving...' : 'Approve USDC'}
                    </button>
                  ) : (
                    <button
                      onClick={() => mintWrite?.()}
                      disabled={!mintWrite || isMinting || !isValidAmount || !hasApproved}
                      className={`w-full p-2 rounded text-white ${
                        !mintWrite || isMinting || !isValidAmount || !hasApproved
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isMinting ? 'Minting...' : 'Mint'}
                    </button>
                  )}

                  <div className="mt-4 text-sm text-gray-800">
                    <p>
                      <strong>USDC Balance:</strong> {displayUSDC}
                    </p>
                    <p>
                      <strong>USDEC Balance:</strong> {displayUSDEC}
                    </p>
                  </div>
                  {txHash && (
                    <div className="mt-2">
                      <a
                        href={`https://basescan.org/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Transaction
                      </a>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Redeem Section */}
        <div className="bg-white bg-opacity-90 shadow-xl rounded-2xl p-6 w-full max-w-sm text-center mb-6">
          <h3 className="text-md font-semibold text-gray-800 mb-1">Redeem USDEC</h3>
          <p className="text-sm text-gray-700 mb-2">Unlocked: {displayUnlocked} USDEC</p>
          <input
            type="number"
            placeholder="Amount to redeem"
            value={redeemAmount}
            onChange={e => setRedeemAmount(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-2"
          />
          <button
            onClick={() => redeemWrite?.()}
            disabled={!redeemWrite || isRedeeming || !isValidRedeem}
            className={`w-full p-2 rounded text-white ${
              !redeemWrite || isRedeeming || !isValidRedeem
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isRedeeming ? 'Redeeming...' : 'Redeem'}
          </button>
        </div>

        {/* Vault Info */}
        <div className="bg-white bg-opacity-90 shadow-lg rounded-xl p-4 mb-6 max-w-sm w-full text-center">
          <h3 className="text-md font-semibold text-gray-800 mb-1">Vault Info</h3>
          <p className="text-sm text-gray-700">Name: Arcadia USDC Vault</p>
          <p className="text-sm text-gray-700">Platform: Arcadia Finance</p>
          <p className="text-sm text-gray-700">Network: Base</p>
          <a
            href="https://arcadia.finance/pool/8453/0x3ec4a293Fb906DD2Cd440c20dECB250DeF141dF1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            View Today’s APY
          </a>
        </div>

        {/* The Koru Symbol */}
        <div
          className="w-full max-w-2xl mt-6 p-4 rounded-lg"
          style={{ background: 'linear-gradient(to right, #1a1a1a, #2c2c2c)' }}
        >
          <h3 className="text-lg font-semibold mb-2" style={{ color: '#bc9c22' }}>
            The Koru Symbol
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: '#bc9c22' }}>
            The Koru is a spiral derived from the unfurling frond of the silver fern. It
            symbolizes new life, growth, strength and peace. This yacht, named Koru,
            was built in 2023 and represents a journey toward new beginnings. In the
            creator economy, we honor the same spirit — evolving with purpose and
            navigating the open seas of ownership and opportunity.
          </p>
        </div>
      </div>
    </>
  );
}
