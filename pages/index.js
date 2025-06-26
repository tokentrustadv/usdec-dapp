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

// Addresses & constants
const USDEC_ADDRESS     = '0x67B9F920f86dd6483513d046CdA954D7a50EB18E'
const RAW_USDC_ADDRESS  = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const MIN_INPUT         = 11
const MAX_INPUT         = 500
const MINT_FEE_BPS      = 100
const BPS_DENOMINATOR   = 10000
const MIN_VAULT         = utils.parseUnits('10', 6)

// Arcadia vault ABI (previewDeposit + asset)
const ARC_LENDING_POOL_ADDRESS = '0x3ec4a293Fb906DD2Cd440c20dECB250DeF141dF1'
const arcadiaVaultAbi = [
  {
    inputs:    [{ internalType: 'uint256', name: 'assets', type: 'uint256' }],
    name:      'previewDeposit',
    outputs:   [{ internalType: 'uint256', name: '',      type: 'uint256' }],
    stateMutability: 'view',
    type:      'function',
  },
  {
    inputs:    [],
    name:      'asset',
    outputs:   [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type:      'function',
  },
]

export default function Home() {
  const { address, isConnected } = useAccount()
  const { chain }               = useNetwork()
  const onBase                  = chain?.id === 8453

  // State
  const [amount, setAmount]   = useState('')
  const [redeem, setRedeem]   = useState('')
  const [txHash, setTxHash]   = useState('')
  const [hasApproved, setApp] = useState(false)

  // Parse + validate mint input
  const parsedAmt = useMemo(() => Number(amount), [amount])
  const isValidAmount =
    !isNaN(parsedAmt) &&
    parsedAmt >= MIN_INPUT &&
    parsedAmt <= MAX_INPUT

  // On-chain values
  const fullAmount = useMemo(
    () =>
      isValidAmount
        ? utils.parseUnits(parsedAmt.toFixed(6), 6)
        : undefined,
    [parsedAmt, isValidAmount]
  )
  const fullAmountHex = fullAmount?.toHexString()
  const feeAmount     = fullAmount?.mul(MINT_FEE_BPS).div(BPS_DENOMINATOR)
  const vaultAmount   = feeAmount ? fullAmount.sub(feeAmount) : undefined
  const vaultAmountHex= vaultAmount?.toHexString()
  const vaultReady    = vaultAmount?.gte(MIN_VAULT) ?? false

  // Allowlist
  const isAllowed = address
    ? allowedUsers.map(a => a.toLowerCase()).includes(address.toLowerCase())
    : false

  // Raw USDC balance
  const { data: rawUsdcBN } = useContractRead({
    address:     RAW_USDC_ADDRESS,
    abi:         erc20ABI,
    functionName:'balanceOf',
    args:        [address],
    enabled:     isConnected && onBase,
    watch:       true,
  })
  const displayRawUsdc = rawUsdcBN
    ? (Number(rawUsdcBN) / 1e6).toFixed(2)
    : '0.00'

  // USDEC balance
  const { data: usdecBalBN } = useContractRead({
    address:      USDEC_ADDRESS,
    abi:          usdecAbi,
    functionName: 'balanceOf',
    args:         [address],
    enabled:      isConnected && onBase,
    watch:        true,
  })
  const displayUsdec = usdecBalBN
    ? (Number(usdecBalBN) / 1e6).toFixed(4)
    : '0.0000'

  // Approval hook (raw USDC → USDEC)
  const { config: approveCfg } = usePrepareContractWrite({
    address:      RAW_USDC_ADDRESS,
    abi:          erc20ABI,
    functionName: 'approve',
    args:         fullAmountHex ? [USDEC_ADDRESS, fullAmountHex] : undefined,
    enabled:      isConnected && onBase && isValidAmount && isAllowed,
  })
  const { write: approveWrite, data: approveData, isLoading: isApproving } =
    useContractWrite({
      ...approveCfg,
      onSuccess() { toast.success('Approval sent!') },
      onError(e)  { toast.error('Approve failed: ' + e.message) },
    })
  useWaitForTransaction({
    hash:    approveData?.hash,
    enabled: Boolean(approveData?.hash),
    onSuccess() {
      setApp(true)
      toast.success('Approval confirmed!')
    },
  })

  // Mint hook (USDEC.mint)
  const { config: mintCfg, error: mintPrepError } = usePrepareContractWrite({
    address:      USDEC_ADDRESS,
    abi:          usdecAbi,
    functionName: 'mint',
    args:         vaultReady && fullAmountHex ? [fullAmountHex] : undefined,
    enabled:      isConnected && onBase && isAllowed && hasApproved && vaultReady,
  })
  const { write: mintWrite, isLoading: isMinting, data: mintData } =
    useContractWrite({
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

  // Preview shares hook
  const { data: previewSharesBN } = useContractRead({
    address:      ARC_LENDING_POOL_ADDRESS,
    abi:          arcadiaVaultAbi,
    functionName: 'previewDeposit',
    args:         vaultReady && vaultAmountHex ? [vaultAmountHex] : undefined,
    enabled:      Boolean(vaultReady && vaultAmountHex),
    watch:        true,
  })
  const previewShares = previewSharesBN
    ? BigInt(previewSharesBN.toString())
    : 0n

  // Read vault’s underlying asset()
  const { data: assetAddress, isError: assetErr } = useContractRead({
    address:      ARC_LENDING_POOL_ADDRESS,
    abi:          arcadiaVaultAbi,
    functionName: 'asset',
    enabled:      isConnected && onBase,
  })
  useEffect(() => {
    if (assetErr) {
      console.error('Error reading vault asset():', assetErr)
    } else if (assetAddress) {
      console.log('Arcadia vault asset():', assetAddress)
    }
  }, [assetAddress, assetErr])

  // Redeem hook
  const redeemValue = useMemo(() => {
    const n = Number(redeem)
    return isNaN(n) || n <= 0
      ? undefined
      : utils.parseUnits(redeem, 6)
  }, [redeem])
  const redeemHex = redeemValue?.toHexString()
  const { config: redeemCfg } = usePrepareContractWrite({
    address:      USDEC_ADDRESS,
    abi:          usdecAbi,
    functionName: 'redeem',
    args:         redeemHex ? [redeemHex] : undefined,
    enabled:      isConnected && onBase && Boolean(redeemHex),
  })
  const { write: redeemWrite, isLoading: isRedeeming } =
    useContractWrite({
      ...redeemCfg,
      onSuccess(d) {
        setTxHash(d.hash)
        toast.success('Redeem sent!')
        setRedeem('')
      },
      onError(e) { toast.error('Redeem failed: ' + e.message) },
    })

  // Reset approval on amount change
  useEffect(() => setApp(false), [amount])

  return (
    <>
      <Head>
        <meta charSet="utf-8"/>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <title>USDEC – A Stablecoin Built for the Creator Economy</title>
        <link rel="icon" href="/favicon.png"/>
      </Head>
      <main
        className="min-h-screen p-4 bg-center bg-contain bg-no-repeat"
        style={{
          backgroundImage: "url('/koru-bg-wide.png')",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center bg-black bg-opacity-60 p-4 rounded-xl my-6">
          <Image
            src="/usdec-logo-gold.png"
            width={180}
            height={180}
            alt="USDEC"
          />
          <p className="text-xs text-gray-200 italic">
            ⏳ redeemable anytime
          </p>
        </div>

        {/* Balances */}
        <section className="bg-white bg-opacity-90 p-4 rounded-xl shadow-lg max-w-sm mx-auto mb-6">
          <h3 className="font-semibold mb-2">Your Balances</h3>
          <p><strong>Raw USDC:</strong> {displayRawUsdc}</p>
          <p><strong>Minted USDEC:</strong> {displayUsdec}</p>
        </section>

        {/* Mint Section */}
        <section className="bg-white bg-opacity-90 p-6 rounded-2xl shadow-xl max-w-sm mx-auto mb-6 text-center">
          <ConnectButton />
          {isConnected && (
            <>
              {!onBase && <p className="text-red-600 mb-2">Switch to Base network.</p>}
              {!isAllowed ? (
                <p className="text-red-600 mb-4">🚫 Not allow-listed.</p>
              ) : (
                <>
                  <input
                    type="number"
                    min={MIN_INPUT}
                    max={MAX_INPUT}
                    placeholder={`Enter ${MIN_INPUT}–${MAX_INPUT} USDC (you have ${displayRawUsdc})`}
                    value={amount}
                    onChange={e => {
                      const v = e.target.value
                      if (v === '' || /^\d*(\.\d{0,6})?$/.test(v)) {
                        setAmount(v)
                      }
                    }}
                    className="w-full p-2 mb-2 border rounded"
                  />

                  {isValidAmount && vaultAmount && (
                    <p className="text-gray-700 mb-2">
                      Fee: {(Number(feeAmount) / 1e6).toFixed(2)} USDC • Vault: {(Number(vaultAmount) / 1e6).toFixed(2)} USDC
                    </p>
                  )}

                  {!vaultReady && vaultAmount && (
                    <p className="text-red-600 mb-2">
                      After fee, deposit {(Number(vaultAmount) / 1e6).toFixed(2)} USDC — must be ≥ 10 USDC.
                    </p>
                  )}

                  {mintPrepError && (
                    <p className="text-red-600 mb-2">{mintPrepError.message}</p>
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
                      disabled={!mintWrite || isMinting || !vaultReady}
                      className="w-full p-2 text-white rounded bg-blue-600 disabled:bg-gray-400"
                    >
                      {isMinting ? 'Minting…' : 'Mint'}
                    </button>
                  )}

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
              )}
            </>
          )}
        </section>

        {/* Redeem Section */}
        <section className="bg-white bg-opacity-90 p-6 rounded-2xl shadow-xl max-w-sm mx-auto mb-6 text-center">
          <h3 className="font-semibold mb-1">Redeem USDEC</h3>
          <input
            type="number"
            placeholder="Amount to redeem"
            value={redeem}
            onChange={e => setRedeem(e.target.value)}
            className="w-full p-2 mb-2 border rounded"
          />
          <button
            onClick={() => redeemWrite?.()}
            disabled={!redeemWrite || isRedeeming || !redeemHex}
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
        <section
          className="max-w-2xl mx-auto p-4 rounded-lg"
          style={{ background: 'linear-gradient(to right, #1a1a1a, #2c2c2c)' }}
        >
          <h3 className="text-xl font-semibold mb-2" style={{ color: '#bc9c22' }}>
            The Koru Symbol
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: '#bc9c22' }}>
            The Koru is a spiral derived from the unfurling frond of the silver
            fern. It symbolizes new life, growth, strength and peace. This yacht,
            named Koru, was built in 2023 and represents a journey toward new
            beginnings. In the creator economy, we honor the same spirit —
            evolving with purpose and navigating the open seas of ownership and
            opportunity.
          </p>
        </section>
      </main>
    </>
  )
}
