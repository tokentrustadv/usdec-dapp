// pages/index.js
import Head from 'next/head'
import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import toast from 'react-hot-toast'
import {
  useAccount,
  useNetwork,
  useContractRead,
  usePrepareContractWrite,
  useContractWrite,
  useWaitForTransaction,
} from 'wagmi'
import { erc20ABI } from 'wagmi'
import { utils, BigNumber } from 'ethers'
import usdecAbi from '../usdecAbi.json'
import { allowedUsers } from '../allowlist'

// Contract addresses & constants
const USDEC_ADDRESS            = '0x94a2134364df27e1df711c1f0ff4b194b3e20660'
const BASE_USDC_ADDRESS        = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const MIN_INPUT                = 11      // user must enter ≥11 USDC so net ≥10
const MAX_INPUT                = 500     // cap per mint
const MINT_FEE_BPS             = 100     // 1%
const BPS_DENOMINATOR          = 10_000
// 10 USDC minimum into vault, in 6 decimals
const MIN_VAULT                = utils.parseUnits('10', 6)

// Arcadia previewDeposit ABI
const ARC_LENDING_POOL_ADDRESS = '0x3ec4a293Fb906DD2Cd440c20dECB250DeF141dF1'
const arcadiaVaultAbi = [{
  inputs:    [{ internalType: 'uint256', name: 'assets', type: 'uint256' }],
  name:      'previewDeposit',
  outputs:   [{ internalType: 'uint256', name: '',      type: 'uint256' }],
  stateMutability: 'view',
  type:      'function',
}]

export default function Home() {
  const { address, isConnected } = useAccount()
  const { chain }               = useNetwork()
  const onBase                  = chain?.id === 8453

  // ── Component state ─────────────────────────────────────────────────
  const [amount, setAmount]   = useState('')
  const [redeem, setRedeem]   = useState('')
  const [txHash, setTxHash]   = useState('')
  const [hasApproved, setApp] = useState(false)

  // ── Parse + validate mint input ──────────────────────────────────────
  const parsedAmt = useMemo(() => {
    const n = Number(amount)
    return isNaN(n) ? NaN : n
  }, [amount])

  const isValidAmount = !isNaN(parsedAmt)
    && parsedAmt >= MIN_INPUT
    && parsedAmt <= MAX_INPUT

  // ── Convert to BigNumber microunits for on-chain ───────────────────────
  const fullAmount = useMemo(() => {
    if (!isValidAmount) return undefined
    return utils.parseUnits(parsedAmt.toFixed(6), 6)
  }, [parsedAmt, isValidAmount])

  // ── Fee + net deposit calculation ───────────────────────────────────
  const feeAmount   = fullAmount?.mul(MINT_FEE_BPS).div(BPS_DENOMINATOR)
  const vaultAmount = feeAmount ? fullAmount.sub(feeAmount) : undefined
  const vaultReady  = vaultAmount?.gte(MIN_VAULT) ?? false

  // ── Allowlist check ──────────────────────────────────────────────────
  const isAllowed = address
    ? allowedUsers.map(a => a.toLowerCase()).includes(address.toLowerCase())
    : false

  // ── Approval hook ────────────────────────────────────────────────────
  const { config: approveCfg } = usePrepareContractWrite({
    address:      BASE_USDC_ADDRESS,
    abi:          erc20ABI,
    functionName: 'approve',
    args:         vaultReady && fullAmount ? [USDEC_ADDRESS, fullAmount] : undefined,
    enabled:      isConnected && onBase && isValidAmount && isAllowed,
  })
  const {
    write:     approveWrite,
    data:      approveData,
    isLoading: isApproving,
  } = useContractWrite({
    ...approveCfg,
    onSuccess() { toast.success('Approval sent!') },
    onError(e) { toast.error('Approve failed: ' + e.message) },
  })
  useWaitForTransaction({
    hash:    approveData?.hash,
    enabled: Boolean(approveData?.hash),
    onSuccess() {
      setApp(true)
      toast.success('Approval confirmed!')
    },
  })

  // ── Mint hook ────────────────────────────────────────────────────────
  const { config: mintCfg, error: mintPrepError } = usePrepareContractWrite({
    address:      USDEC_ADDRESS,
    abi:          usdecAbi,
    functionName: 'mint',
    args:         vaultReady && fullAmount ? [fullAmount] : undefined,
    enabled:      isConnected && onBase && isAllowed && hasApproved && vaultReady,
  })
  const {
    write:     mintWrite,
    isLoading: isMinting,
    data:      mintData,
  } = useContractWrite({
    ...mintCfg,
    onSuccess(d) {
      setTxHash(d.hash)
      toast.success('Mint tx sent!')
      setAmount('')
      setApp(false)
    },
    onError(e) { toast.error('Mint failed: ' + e.message) },
  })
  useWaitForTransaction({
    hash:    mintData?.hash,
    enabled: Boolean(mintData?.hash),
    onSuccess() { toast.success('Mint confirmed!') },
  })

  // ── Preview shares hook ──────────────────────────────────────────────
  const { data: previewSharesBN } = useContractRead({
    address:      ARC_LENDING_POOL_ADDRESS,
    abi:          arcadiaVaultAbi,
    functionName: 'previewDeposit',
    args:         vaultReady && vaultAmount ? [vaultAmount] : undefined,
    enabled:      Boolean(vaultReady && vaultAmount),
    watch:        true,
  })
  const previewShares = previewSharesBN
    ? BigInt(previewSharesBN.toString())
    : 0n

  // ── Parse + convert redeem input ─────────────────────────────────────
  const redeemValue = useMemo(() => {
    const n = Number(redeem)
    if (isNaN(n) || n <= 0) return undefined
    try {
      return utils.parseUnits(redeem, 6)
    } catch {
      return undefined
    }
  }, [redeem])

  // ── Redeem hook ──────────────────────────────────────────────────────
  const { config: redeemCfg } = usePrepareContractWrite({
    address:      USDEC_ADDRESS,
    abi:          usdecAbi,
    functionName: 'redeem',
    args:         redeemValue ? [redeemValue] : undefined,
    enabled:      isConnected && onBase && Boolean(redeemValue),
  })
  const {
    write:      redeemWrite,
    isLoading:  isRedeeming,
  } = useContractWrite({
    ...redeemCfg,
    onSuccess(d) {
      setTxHash(d.hash)
      toast.success('Redeem sent!')
      setRedeem('')
    },
    onError(e) { toast.error('Redeem failed: ' + e.message) },
  })

  // ── Balance reads ────────────────────────────────────────────────────
  const usdcBal  = useContractRead({
    address:      BASE_USDC_ADDRESS,
    abi:          erc20ABI,
    functionName: 'balanceOf',
    args:         [address],
    enabled:      isConnected,
    watch:        true,
  }).data ?? BigNumber.from(0)

  const usdecBal = useContractRead({
    address:      USDEC_ADDRESS,
    abi:          usdecAbi,
    functionName: 'balanceOf',
    args:         [address],
    enabled:      isConnected,
    watch:        true,
  }).data ?? BigNumber.from(0)

  const unlocked = useContractRead({
    address:      USDEC_ADDRESS,
    abi:          usdecAbi,
    functionName: 'unlockedBalance',
    args:         [address],
    enabled:      isConnected,
    watch:        true,
  }).data ?? BigNumber.from(0)

  const displayUSDC  = (Number(usdcBal)  / 1e6).toFixed(2)
  const displayUSDEC = (Number(usdecBal) / 1e6).toFixed(4)
  const displayUnl   = (Number(unlocked) / 1e6).toFixed(4)

  // ── Reset approval when amount changes ───────────────────────────────
  useEffect(() => { setApp(false) }, [amount])

  return (
    <>
      <Head>
        <meta charSet="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>USDEC – A Stablecoin Built for the Creator Economy</title>
        <link rel="icon" href="/favicon.png"/>
      </Head>
      <main className="min-h-screen p-4 bg-cover bg-center" style={{ backgroundImage: "url('/koru-bg-wide.png')" }}>
        {/* Logo + Note */}
        <div className="flex flex-col items-center bg-black bg-opacity-60 p-4 rounded-xl my-6">
          <Image src="/usdec-logo-gold.png" width={180} height={180} alt="USDEC"/>
          <p className="text-xs text-gray-200 italic">⏳ redeemable anytime</p>
        </div>

        {/* Mint Section */}
        <section className="bg-white bg-opacity-90 p-6 rounded-2xl shadow-xl max-w-sm mx-auto mb-6 text-center">
          <ConnectButton/>
          {isConnected && (
            <>
              {!onBase && <p className="text-red-600 mb-2">Switch to Base network.</p>}
              {!isAllowed
                ? <div className="text-red-600 mb-4">🚫 Not allow-listed.</div>
                : <>
                  <input
                    type="number"
                    min={MIN_INPUT}
                    max={MAX_INPUT}
                    placeholder={`Enter ${MIN_INPUT}–${MAX_INPUT} USDC (you have ${displayUSDC})`}
                    value={amount}
                    onChange={e => {
                      const v = e.target.value
                      if (v === '' || /^\d*(\.\d{0,6})?$/.test(v)) setAmount(v)
                    }}
                    className="w-full p-2 mb-2 border rounded"
                  />

                  {isValidAmount && vaultAmount && (
                    <p className="text-gray-700 mb-2">
                      Fee: {(Number(feeAmount)  / 1e6).toFixed(2)} USDC • Vault: {(Number(vaultAmount) / 1e6).toFixed(2)} USDC
                    </p>
                  )}

                  {!vaultReady && vaultAmount && (
                    <p className="text-red-600 mb-2">
                      After fee, deposit {(Number(vaultAmount)/1e6).toFixed(2)} USDC — must be ≥ 10 USDC.
                    </p>
                  )}

                  {mintPrepError && (
                    <p className="text-red-600 mb-2">{mintPrepError.message}</p>
                  )}

                  {!hasApproved
                    ? <button
                        onClick={() => approveWrite?.()}
                        disabled={!approveWrite || isApproving || !isValidAmount}
                        className="w-full p-2 mb-2 text-white rounded bg-yellow-600 disabled:bg-gray-400"
                      >
                        {isApproving ? 'Approving…' : 'Approve USDC'}
                      </button>
                    : <button
                        onClick={() => mintWrite?.()}
                        disabled={!mintWrite || isMinting || !vaultReady}
                        className="w-full p-2 text-white rounded bg-blue-600 disabled:bg-gray-400"
                      >
                        {isMinting ? 'Minting…' : 'Mint'}
                      </button>
                  }

                  <div className="mt-4 text-left text-gray-800 text-sm">
                    <p><strong>USDC:</strong> {displayUSDC}</p>
                    <p><strong>USDEC:</strong> {displayUSDEC}</p>
                  </div>

                  {txHash && (
                    <a
                      href={`https://basescan.org/tx/${txHash}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 underline text-sm mt-2 block"
                    >
                      View tx →
                    </a>
                  )}
                </>
              }
            </>
          )}
        </section>

        {/* Redeem Section */}
        <section className="bg-white bg-opacity-90 p-6 rounded-2xl shadow-xl max-w-sm mx-auto mb-6 text-center">
          <h3 className="font-semibold mb-1">Redeem USDEC</h3>
          <p className="text-sm mb-2">Unlocked: {displayUnl} USDEC</p>
          <input
            type="number"
            placeholder="Amount to redeem"
            value={redeem}
            onChange={e => setRedeem(e.target.value)}
            className="w-full p-2 mb-2 border rounded"
          />
          <button
            onClick={() => redeemWrite?.()}
            disabled={!redeemWrite || isRedeeming || !redeemValue}
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
            target="_blank" rel="noopener noreferrer"
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
            The Koru is a spiral derived from the unfurling frond of the silver fern.
            It symbolizes new life, growth, strength and peace. This yacht, named Koru,
            was built in 2023 and represents a journey toward new beginnings. In the
            creator economy, we honor the same spirit — evolving with purpose and
            navigating the open seas of ownership and opportunity.
          </p>
        </section>
      </main>
    </>
  )
}
