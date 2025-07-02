"use client";

import { useState, useMemo } from "react";
import Head from "next/head";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useNetwork,
  usePrepareContractWrite,
  useContractWrite,
  useWaitForTransaction,
  useContractRead,
} from "wagmi";
import { ethers } from "ethers";
import { erc20ABI } from "wagmi";
import usdecAbi from "../usdecAbi.json";
import toast from "react-hot-toast";

const USDEC_ADDRESS = "0xa4905465C52c1cd7e8cb9C8AA8C5a1DD5fbFCC7b";
const USDC_ADDRESS  = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const DECIMALS      = 6;
const BASE_CHAIN_ID = 8453;

export default function Home() {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const onBase = chain?.id === BASE_CHAIN_ID;

  const [mintAmt, setMintAmt]     = useState("");
  const [redeemAmt, setRedeemAmt] = useState("");
  const [txHash, setTxHash]       = useState("");

  // parse amounts
  const mintValue = useMemo(() => {
    try { return ethers.utils.parseUnits(mintAmt || "0", DECIMALS); }
    catch { return undefined; }
  }, [mintAmt]);
  const redeemValue = useMemo(() => {
    try { return ethers.utils.parseUnits(redeemAmt || "0", DECIMALS); }
    catch { return undefined; }
  }, [redeemAmt]);

  // approval check
  const { data: allowance } = useContractRead({
    address: USDC_ADDRESS,
    abi: erc20ABI,
    functionName: "allowance",
    args: [address, USDEC_ADDRESS],
    enabled: isConnected && onBase && Boolean(mintValue),
    watch: true,
  });
  const needsApprove = allowance && mintValue && allowance.lt(mintValue);

  // APPROVE
  const { config: aprCfg, error: aprPrepError } = usePrepareContractWrite({
    address: USDC_ADDRESS,
    abi: erc20ABI,
    functionName: "approve",
    args: needsApprove ? [USDEC_ADDRESS, mintValue] : undefined,
    enabled: needsApprove,
  });
  const { write: doApprove, isLoading: aprLoading, error: aprWriteError } = useContractWrite({
    ...aprCfg,
    onError(e) { 
      console.error("Approve error", e); 
      toast.error(`Approve failed: ${e.message}`); 
    },
    onSuccess() { toast.success("Approve tx sent"); }
  });
  useWaitForTransaction({
    hash: doApprove?.hash,
    onSuccess() { toast.success("Approve confirmed"); }
  });

  // MINT
  const { config: mintCfg, error: mintPrepError } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: "mint",
    args: mintValue ? [mintValue] : undefined,
    enabled: isConnected && onBase && !needsApprove && Boolean(mintValue),
  });
  const { write: doMint, isLoading: mintLoading, error: mintWriteError } = useContractWrite({
    ...mintCfg,
    onError(e) { 
      console.error("Mint error", e); 
      toast.error(`Mint failed: ${e.message}`); 
    },
    onSuccess(d) {
      setTxHash(d.hash);
      setMintAmt("");
      toast.success("Mint tx sent");
    }
  });
  useWaitForTransaction({
    hash: doMint?.hash,
    onSuccess() { toast.success("Mint confirmed"); }
  });

  // REDEEM
  const { config: redCfg, error: redPrepError } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: "redeem",
    args: redeemValue ? [redeemValue] : undefined,
    enabled: isConnected && onBase && Boolean(redeemValue),
  });
  const { write: doRedeem, isLoading: redLoading, error: redWriteError } = useContractWrite({
    ...redCfg,
    onError(e) { 
      console.error("Redeem error", e); 
      toast.error(`Redeem failed: ${e.message}`); 
    },
    onSuccess(d) {
      setTxHash(d.hash);
      setRedeemAmt("");
      toast.success("Redeem tx sent");
    }
  });
  useWaitForTransaction({
    hash: doRedeem?.hash,
    onSuccess() { toast.success("Redeem confirmed"); }
  });

  return (
    <>
      <Head>
        <title>USDEC Mint & Redeem</title>
      </Head>
      <main className="p-6 space-y-6 max-w-md mx-auto">
        <ConnectButton />

        {!onBase && isConnected && (
          <p className="text-red-600">
            Please switch your wallet to Base (chain {BASE_CHAIN_ID}).
          </p>
        )}

        {/* Mint */}
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Mint USDEC</h2>
          <input
            type="number"
            placeholder="USDC amount"
            value={mintAmt}
            onChange={(e) => setMintAmt(e.target.value)}
            className="w-full p-2 border"
            disabled={!onBase}
          />
          {aprPrepError && <p className="text-red-600">{aprPrepError.message}</p>}
          {aprWriteError && <p className="text-red-600">{aprWriteError.message}</p>}
          {mintPrepError && <p className="text-red-600">{mintPrepError.message}</p>}
          {mintWriteError && <p className="text-red-600">{mintWriteError.message}</p>}

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
          <h2 className="text-xl font-bold">Redeem USDEC</h2>
          <input
            type="number"
            placeholder="USDEC amount"
            value={redeemAmt}
            onChange={(e) => setRedeemAmt(e.target.value)}
            className="w-full p-2 border"
            disabled={!onBase}
          />
          {redPrepError && <p className="text-red-600">{redPrepError.message}</p>}
          {redWriteError && <p className="text-red-600">{redWriteError.message}</p>}

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
