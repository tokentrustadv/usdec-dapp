"use client";

import { useState, useMemo } from "react";
import Head from "next/head";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useNetwork,
  useContractRead,
  usePrepareContractWrite,
  useContractWrite,
  useWaitForTransaction,
} from "wagmi";
import { ethers } from "ethers";
import { erc20ABI } from "wagmi";
import usdecAbi from "../usdecAbi.json";
import toast from "react-hot-toast";

const USDEC_ADDRESS   = "0xa4905465C52c1cd7e8cb9C8AA8C5a1DD5fbFCC7b";
const USDC_ADDRESS    = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const DECIMALS        = 6;
const BASE_CHAIN_ID   = 8453;
const AMOUNT_REGEX    = /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/;

export default function Home() {
  const { address, isConnected } = useAccount();
  const { chain }               = useNetwork();
  const onBase                  = chain?.id === BASE_CHAIN_ID;

  const [mintAmt, setMintAmt]     = useState("");
  const [redeemAmt, setRedeemAmt] = useState("");
  const [txHash, setTxHash]       = useState("");

  // parse into BigInt only when valid
  const mintValue = useMemo(() => {
    if (!AMOUNT_REGEX.test(mintAmt)) return undefined;
    try {
      const bn = ethers.utils.parseUnits(mintAmt, DECIMALS);
      return bn.toBigInt() > 0n ? bn.toBigInt() : undefined;
    } catch {
      return undefined;
    }
  }, [mintAmt]);

  const redeemValue = useMemo(() => {
    if (!AMOUNT_REGEX.test(redeemAmt)) return undefined;
    try {
      const bn = ethers.utils.parseUnits(redeemAmt, DECIMALS);
      return bn.toBigInt() > 0n ? bn.toBigInt() : undefined;
    } catch {
      return undefined;
    }
  }, [redeemAmt]);

  // read allowance
  const { data: allowance } = useContractRead({
    address: USDC_ADDRESS,
    abi: erc20ABI,
    functionName: "allowance",
    args: [address, USDEC_ADDRESS],
    enabled: isConnected && onBase && Boolean(mintValue),
    watch: true,
  });
  const needsApprove =
    allowance &&
    mintValue !== undefined &&
    BigInt(allowance.toString()) < mintValue;

  //
  // 1) APPROVE USDC → USDEC
  //
  const { config: aprCfg } = usePrepareContractWrite({
    address: USDC_ADDRESS,
    abi: erc20ABI,
    functionName: "approve",
    args: needsApprove ? [USDEC_ADDRESS, mintValue] : undefined,
    enabled: needsApprove,
  });
  const { write: doApprove, isLoading: aprLoading, error: aprError } = useContractWrite({
    ...aprCfg,
    onError(e) { toast.error("Approve failed: " + e.message); },
    onSuccess() { toast.success("Approve sent"); },
  });
  useWaitForTransaction({
    hash: doApprove?.hash,
    onSuccess() { toast.success("Approve confirmed"); },
  });

  //
  // 2) MINT USDEC (skip simulate with recklesslyUnprepared)
  //
  const { write: doMint, isLoading: mintLoading, error: mintError } = useContractWrite({
    mode:         "recklesslyUnprepared",
    address:      USDEC_ADDRESS,
    abi:          usdecAbi,
    functionName: "mint",
    args:         mintValue !== undefined ? [mintValue] : undefined,
    enabled:      isConnected && onBase && !needsApprove && mintValue !== undefined,
    onError(e)   { toast.error("Mint failed: " + e.message); },
    onSuccess(tx) {
      setTxHash(tx.hash);
      setMintAmt("");
      toast.success("Mint tx sent");
    },
  });
  useWaitForTransaction({
    hash:    doMint?.hash,
    onSuccess() { toast.success("Mint confirmed"); },
  });

  //
  // 3) REDEEM USDEC (also recklesslyUnprepared)
  //
  const { write: doRedeem, isLoading: redLoading, error: redError } = useContractWrite({
    mode:         "recklesslyUnprepared",
    address:      USDEC_ADDRESS,
    abi:          usdecAbi,
    functionName: "redeem",
    args:         redeemValue !== undefined ? [redeemValue] : undefined,
    enabled:      isConnected && onBase && redeemValue !== undefined,
    onError(e)   { toast.error("Redeem failed: " + e.message); },
    onSuccess(tx) {
      setTxHash(tx.hash);
      setRedeemAmt("");
      toast.success("Redeem tx sent");
    },
  });
  useWaitForTransaction({
    hash:    doRedeem?.hash,
    onSuccess() { toast.success("Redeem confirmed"); },
  });

  return (
    <>
      <Head><title>USDEC Mint & Redeem</title></Head>
      <main className="p-6 max-w-md mx-auto space-y-6">
        <ConnectButton />

        {!onBase && isConnected && (
          <p className="text-red-600">
            Switch your wallet to Base (chain {BASE_CHAIN_ID}).
          </p>
        )}

        {/* Mint */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold">Mint USDEC</h2>
          <input
            className="w-full p-2 border"
            placeholder="USDC amount"
            value={mintAmt}
            onChange={e => setMintAmt(e.target.value)}
            disabled={!onBase}
          />
          {aprError && <p className="text-red-600">{aprError.message}</p>}
          {mintError && <p className="text-red-600">{mintError.message}</p>}
          {needsApprove ? (
            <button
              onClick={() => doApprove?.()}
              disabled={!doApprove || aprLoading}
              className="btn"
            >
              {aprLoading ? "Approving…" : "Approve USDC"}
            </button>
          ) : (
            <button
              onClick={() => doMint?.()}
              disabled={!doMint || mintLoading}
              className="btn"
            >
              {mintLoading ? "Minting…" : "Mint USDEC"}
            </button>
          )}
        </section>

        {/* Redeem */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold">Redeem USDEC</h2>
          <input
            className="w-full p-2 border"
            placeholder="USDEC amount"
            value={redeemAmt}
            onChange={e => setRedeemAmt(e.target.value)}
            disabled={!onBase}
          />
          {redError && <p className="text-red-600">{redError.message}</p>}
          <button
            onClick={() => doRedeem?.()}
            disabled={!doRedeem || redLoading}
            className="btn"
          >
            {redLoading ? "Redeeming…" : "Redeem USDC"}
          </button>
        </section>

        {/* Tx Link */}
        {txHash && (
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600"
          >
            View Tx on BaseScan
          </a>
        )}
      </main>
    </>
  );
}
