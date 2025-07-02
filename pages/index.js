"use client";

import { useState, useMemo } from "react";
import Head from "next/head";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  usePrepareContractWrite,
  useContractWrite,
  useWaitForTransaction,
  useContractRead,
} from "wagmi";
import { ethers } from "ethers";
import { erc20ABI } from "wagmi";
import usdecAbi from "../usdecAbi.json";

const USDEC_ADDRESS = "0xa4905465C52c1cd7e8cb9C8AA8C5a1DD5fbFCC7b";
const USDC_ADDRESS  = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const DECIMALS      = 6;

export default function Home() {
  const { address, isConnected } = useAccount();

  // — INPUT state —
  const [mintAmt, setMintAmt]     = useState("");
  const [redeemAmt, setRedeemAmt] = useState("");
  const [txHash, setTxHash]       = useState("");

  // — Parse amounts to BigNumber or undefined —
  const mintValue = useMemo(() => {
    try { return ethers.utils.parseUnits(mintAmt || "0", DECIMALS); }
    catch { return undefined; }
  }, [mintAmt]);

  const redeemValue = useMemo(() => {
    try { return ethers.utils.parseUnits(redeemAmt || "0", DECIMALS); }
    catch { return undefined; }
  }, [redeemAmt]);

  // — Approval check —
  const { data: allowance } = useContractRead({
    address: USDC_ADDRESS,
    abi: erc20ABI,
    functionName: "allowance",
    args: [address, USDEC_ADDRESS],
    enabled: isConnected && Boolean(mintValue),
    watch: true,
  });
  const needsApprove = allowance && mintValue && allowance.lt(mintValue);

  // — Prepare / write approve tx —
  const { config: aprCfg } = usePrepareContractWrite({
    address: USDC_ADDRESS,
    abi: erc20ABI,
    functionName: "approve",
    args: needsApprove ? [USDEC_ADDRESS, mintValue] : undefined,
    enabled: needsApprove,
  });
  const { write: doApprove, isLoading: aprLoading } = useContractWrite(aprCfg);
  useWaitForTransaction({ hash: doApprove?.hash, onSuccess: () => alert("Approved!") });

  // — Prepare / write mint tx —
  const { config: mintCfg } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: "mint",
    args: mintValue ? [mintValue] : undefined,
    enabled: isConnected && !needsApprove && Boolean(mintValue),
  });
  const { write: doMint, isLoading: mintLoading } = useContractWrite({
    ...mintCfg,
    onSuccess(d) {
      setTxHash(d.hash);
      setMintAmt("");
      alert("Mint tx sent!");
    },
  });
  useWaitForTransaction({ hash: doMint?.hash, onSuccess: () => alert("Mint confirmed!") });

  // — Prepare / write redeem tx —
  const { config: redCfg } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: "redeem",
    args: redeemValue ? [redeemValue] : undefined,
    enabled: isConnected && Boolean(redeemValue),
  });
  const { write: doRedeem, isLoading: redLoading } = useContractWrite({
    ...redCfg,
    onSuccess(d) {
      setTxHash(d.hash);
      setRedeemAmt("");
      alert("Redeem tx sent!");
    },
  });
  useWaitForTransaction({ hash: doRedeem?.hash, onSuccess: () => alert("Redeem confirmed!") });

  return (
    <>
      <Head>
        <title>USDEC Mint & Redeem</title>
      </Head>
      <main className="p-8 space-y-6 max-w-md mx-auto">
        <ConnectButton />

        {/* Mint Section */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold">Mint USDEC</h2>
          <input
            type="number"
            placeholder="USDC amount"
            value={mintAmt}
            onChange={(e) => setMintAmt(e.target.value)}
            className="border p-2 w-full"
          />
          {needsApprove ? (
            <button
              onClick={() => doApprove?.()}
              disabled={aprLoading}
              className="btn"
            >
              {aprLoading ? "Approving…" : "Approve USDC"}
            </button>
          ) : (
            <button
              onClick={() => doMint?.()}
              disabled={mintLoading}
              className="btn"
            >
              {mintLoading ? "Minting…" : "Mint USDEC"}
            </button>
          )}
        </section>

        {/* Redeem Section */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold">Redeem USDEC</h2>
          <input
            type="number"
            placeholder="USDEC amount"
            value={redeemAmt}
            onChange={(e) => setRedeemAmt(e.target.value)}
            className="border p-2 w-full"
          />
          <button
            onClick={() => doRedeem?.()}
            disabled={redLoading}
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
