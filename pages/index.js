// pages/index.js
import Head from 'next/head';
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import toast from 'react-hot-toast';
import {
  useAccount,
  useNetwork,
  usePrepareContractWrite,
  useContractWrite,
  useWaitForTransaction,
  useContractRead,
} from 'wagmi';
import { erc20ABI } from 'wagmi';
import { utils } from 'ethers';
import usdecAbi from '../usdecAbi.json';
import { allowedUsers } from '../allowlist';

const USDEC_ADDRESS     = '0x94a2134364df27e1df711c1f0ff4b194b3e20660';
const BASE_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const MIN_INPUT         = 11;    // user must input ≥11 USDC (so ≥10 net after fee)
const MAX_INPUT         = 500;
const BASE_CHAIN_ID     = 8453;  // Base mainnet

export default function Home() {
  const { address, isConnected } = useAccount();
  const { chain }               = useNetwork();
  const onBase                  = chain?.id === BASE_CHAIN_ID;

  const [amount, setAmount]         = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [txHash, setTxHash]         = useState('');
  const [hasApproved, setHasApproved] = useState(false);

  // ── parse + validate ───────────────────────────────────────────────────────
  const isValidFormat = /^\d*(\.\d{0,6})?$/.test(amount);
  const parsedAmt     = useMemo(() => isValidFormat ? parseFloat(amount) : NaN, [amount, isValidFormat]);
  const isValidAmount = !isNaN(parsedAmt) && parsedAmt >= MIN_INPUT && parsedAmt <= MAX_INPUT;
  const fullAmount    = useMemo(
    () => isValidAmount ? utils.parseUnits(amount, 6) : undefined,
    [amount, isValidAmount]
  );
  const isAllowed = address ? allowedUsers.includes(address.toLowerCase()) : false;

  // ── approve USDC ──────────────────────────────────────────────────────────
  const { config: approveConfig } = usePrepareContractWrite({
    address: BASE_USDC_ADDRESS,
    abi: erc20ABI,
    functionName: 'approve',
    args: fullAmount ? [USDEC_ADDRESS, fullAmount] : undefined,
    enabled: isConnected && onBase && isValidAmount && isAllowed,
  });
  const { write: approveWrite, data: approveData, isLoading: isApproving } = useContractWrite({
    ...approveConfig,
    onSuccess() { toast.success('Approval sent!'); },
    onError(e) { toast.error('Approve failed: ' + e.message); },
  });
  useWaitForTransaction({
    hash: approveData?.hash,
    onSuccess() {
      setHasApproved(true);
      toast.success('Approval confirmed!');
    },
  });

  // ── mint USDEC ────────────────────────────────────────────────────────────
  const { config: mintConfig, error: mintPrepError } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'mint',
    args: fullAmount ? [fullAmount] : undefined,
    enabled: isConnected && onBase && isValidAmount && isAllowed && hasApproved,
  });
  const { write: mintWrite, isLoading: isMinting, data: mintData } = useContractWrite({
    ...mintConfig,
    onSuccess(d) {
      setTxHash(d.hash);
      toast.success('Mint tx sent!');
      setAmount('');
      setHasApproved(false);
    },
    onError(e) { toast.error('Mint failed: ' + e.message); },
  });
  useWaitForTransaction({
    hash: mintData?.hash,
    onSuccess() { toast.success('Mint confirmed!'); },
  });

  // ── redeem USDEC ──────────────────────────────────────────────────────────
  const parsedRedeem = parseFloat(redeemAmount);
  const { config: redeemConfig } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'redeem',
    args: redeemAmount ? [utils.parseUnits(redeemAmount, 6)] : undefined,
    enabled: isConnected && onBase && !isNaN(parsedRedeem) && parsedRedeem > 0,
  });
  const { write: redeemWrite, isLoading: isRedeeming } = useContractWrite({
    ...redeemConfig,
    onSuccess(d) {
      setTxHash(d.hash);
      toast.success('Redeem sent!');
      setRedeemAmount('');
    },
    onError(e) { toast.error('Redeem failed: ' + e.message); },
  });

  // ── on‐chain balances ──────────────────────────────────────────────────────
  const usdcBal  = useContractRead({
    address: BASE_USDC_ADDRESS, abi: erc20ABI, functionName: 'balanceOf',
    args: [address], enabled: isConnected, watch: true,
  }).data ?? 0n;
  const usdecBal = useContractRead({
    address: USDEC_ADDRESS, abi: usdecAbi, functionName: 'balanceOf',
    args: [address], enabled: isConnected, watch: true,
  }).data ?? 0n;
  const unlocked = useContractRead({
    address: USDEC_ADDRESS, abi: usdecAbi, functionName: 'unlockedBalance',
    args: [address], enabled: isConnected, watch: true,
  }).data ?? 0n;

  const displayUSDC  = (Number(usdcBal)  / 1e6).toFixed(2);
  const displayUSDEC = (Number(usdecBal) / 1e6).toFixed(4);
  const displayUnl   = (Number(unlocked) / 1e6).toFixed(4);

  // ── reset approval when input changes ──────────────────────────────────────
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

      <main className="min-h-screen p-4 bg-cover bg-center" style={{
        backgroundImage: "url('/koru-bg-wide.png')",
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }}>
        {/* Logo & Timer */}
        <div className="flex flex-col items-center bg-black bg-opacity-60 p-4 rounded-xl my-6">
          <Image src="/usdec-logo-gold.png" alt="USDEC Logo" width={180} height={180} />
          <p className="text-xs text-gray-200 italic">⏳ redeemable anytime</p>
        </div>

        {/* Mint Section */}
        <section className="bg-white bg-opacity-90 p-6 rounded-2xl shadow-xl max-w-sm mx-auto mb-6 text-center">
          <ConnectButton />
          {isConnected ? (
            !onBase ? (
              <p className="text-red-600 mb-2">Please switch your wallet to Base network.</p>
            ) : !isAllowed ? (
              <p className="text-red-600 mb-4">🚫 You’re not allow-listed to mint.</p>
            ) : (
              <>
                <input
                  type="number"
                  min={MIN_INPUT}
                  max={MAX_INPUT}
                  placeholder={`Enter ${MIN_INPUT}–${MAX_INPUT} USDC (you have ${displayUSDC})`}
                  value={amount}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || /^\d*(\.\d{0,6})?$/.test(v)) setAmount(v);
                  }}
                  className="w-full p-2 mb-2 border rounded"
                />

                {parsedAmt < MIN_INPUT && amount !== '' && (
                  <p className="text-red-600 text-sm mb-2">Minimum {MIN_INPUT} USDC</p>
                )}
                {isValidAmount && (
                  <p className="text-gray-700 mb-2">
                    Fee: {(parsedAmt * 0.01).toFixed(2)} USDC • Vault: {(parsedAmt * 0.99).toFixed(2)} USDC
                  </p>
                )}
                {mintPrepError && (
                  <p className="text-red-600 text-sm mb-2">{mintPrepError.message}</p>
                )}

                {!hasApproved ? (
                  <button
                    onClick={() => approveWrite?.()}
                    disabled={!approveWrite || isApproving || !isValidAmount}
                    className="w-full p-2 mb-2 text-white rounded bg-yellow-600 disabled:bg-gray-400"
                  >
                    {isApproving ? 'Approving…' : 'Approve USDC'}
                  </button>
                ) : (
                  <button
                    onClick={() => mintWrite?.()}
                    disabled={!mintWrite || isMinting || !isValidAmount}
                    className="w-full p-2 text-white rounded bg-blue-600 disabled:bg-gray-400"
                  >
                    {isMinting ? 'Minting…' : 'Mint'}
                  </button>
                )}

                <div className="mt-4 text-left text-gray-800 text-sm">
                  <p><strong>USDC:</strong> {displayUSDC}</p>
                  <p><strong>USDEC:</strong> {displayUSDEC}</p>
                </div>

                {txHash && (
                  <a
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-sm mt-2 block"
                  >
                    View tx →
                  </a>
                )}
              </>
            )
          ) : null}
        </section>

        {/* Redeem Section */}
        <section className="bg-white bg-opacity-90 p-6 rounded-2xl shadow-xl max-w-sm mx-auto mb-6 text-center">
          <h3 className="font-semibold mb-1">Redeem USDEC</h3>
          <p className="text-sm mb-2">Unlocked: {displayUnl} USDEC</p>
          <input
            type="number"
            placeholder="Amount to redeem"
            value={redeemAmount}
            onChange={e => setRedeemAmount(e.target.value)}
            className="w-full p-2 mb-2 border rounded"
          />
          <button
            onClick={() => redeemWrite?.()}
            disabled={!redeemWrite || isRedeeming || isNaN(parsedRedeem) || parsedRedeem <= 0}
            className="w-full p-2 text-white rounded bg-green-600 disabled:bg-gray-400"
          >
            {isRedeeming ? 'Redeeming…' : 'Redeem'}
          </button>
        </section>

        {/* Vault Info */}
        <section className="bg-white bg-opacity-90 p-4 rounded-xl shadow-lg max-w-sm mx-auto mb-6 text-center">
          <h3 className="font-semibold mb-1">Vault Info</h3>
          <p className="text-sm">Name: Arcadia USDC Vault</p>
          <p className="text-sm">Platform: Arcadia Finance</p>
          <p className="text-sm">Network: Base</p>
          <a
            href="https://arcadia.finance/pool/8453/0x3ec4a293Fb906DD2Cd440c20dECB250DeF141dF1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 underline"
          >
            View Today’s APY
          </a>
        </section>

        {/* The Koru Symbol */}
        <section className="max-w-2xl mx-auto p-4 rounded-lg" style={{ background: 'linear-gradient(to right, #1a1a1a, #2c2c2c)' }}>
          <h3 className="text-xl font-semibold mb-2" style={{ color: '#bc9c22' }}>
            The Koru Symbol
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: '#bc9c22' }}>
            The Koru is a spiral derived from the unfurling frond of the silver fern. It symbolizes new life, growth, strength and peace. This yacht, named Koru, was built in 2023 and represents a journey toward new beginnings. In the creator economy, we honor the same spirit — evolving with purpose and navigating the open seas of ownership and opportunity.
          </p>
        </section>
      </main>
    </>
  );
}
