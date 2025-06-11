// pages/index.js
import Head from 'next/head';
import { allowedUsers } from '../allowlist';
import { useState } from 'react';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useContractWrite,
  useContractRead,
  usePrepareContractWrite,
} from 'wagmi';
import toast from 'react-hot-toast';
import usdecAbi from '../usdecAbi.json';

const USDEC_ADDRESS = '0xAF48B53F4384c04B3e579A127ABd8d8949a6F645';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [recentTxs, setRecentTxs] = useState([]);

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= 500;
  const isAllowed = address ? allowedUsers.includes(address.toLowerCase()) : false;

  const { config } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'mint',
    args: isValidAmount ? [BigInt(Math.round(parsedAmount * 1e6))] : undefined,
    enabled: isConnected && isValidAmount && isAllowed,
  });

  const { write, isLoading } = useContractWrite({
    ...config,
    onSuccess(data) {
      setTxHash(data.hash);
      setRecentTxs((prev) => [data.hash, ...prev.slice(0, 2)]);
      toast.success('Minted successfully!');
    },
    onError(error) {
      toast.error(error.message || 'Transaction failed');
    },
  });

  const { write: redeemWrite, isLoading: redeemLoading } = useContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'redeem',
    args: [BigInt(0)],
    onSuccess(data) {
      setTxHash(data.hash);
      toast.success('Redeem transaction sent!');
    },
    onError(error) {
      toast.error(error.message || 'Redeem failed');
    },
  });

  const { data: balance } = useContractRead({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'balanceOf',
    args: [address],
    enabled: isConnected,
    watch: true,
  });

  const formattedBalance = balance ? (Number(balance) / 1e6).toFixed(4) : '0.0000';
  const hasBalance = balance && Number(balance) > 0;

  const addToWallet = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: USDEC_ADDRESS,
              symbol: 'USDEC',
              decimals: 6,
              image: `${window.location.origin}/usdec-logo-gold.png`,
            },
          },
        });
      } catch (error) {
        console.error('Error adding token:', error);
      }
    }
  };

  return (
    <>
      <Head>
        <title>USDEC – A Stablecoin Built for the Creator Economy</title>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </Head>

      <div className="min-h-screen bg-cover bg-center flex flex-col items-center p-4" style={{
        backgroundImage: "url('/koru-bg-wide.png')",
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div className="flex flex-col items-center mt-6 mb-4 bg-black bg-opacity-60 p-4 rounded-xl">
          <Image src="/usdec-logo-gold.png" alt="USDEC Logo" width={180} height={180} />
          <p className="text-xs text-gray-600 italic mb-2">
            ⏳ redeemable 30 days from mint
          </p>
          <button
            onClick={addToWallet}
            className="mt-2 bg-transparent p-2 rounded hover:opacity-80"
          >
            <Image src="/metamask-icon.png" alt="MetaMask" width={32} height={32} />
          </button>
        </div>

        <div className="bg-white bg-opacity-90 shadow-xl rounded-2xl p-6 w-full max-w-sm text-center mb-6">
          <ConnectButton />
          {isConnected && (
            <div className="mt-4">
              {!isAllowed ? (
                <div className="text-red-600 text-sm font-semibold mb-4">
                  🚫 You are not allowlisted to mint USDEC.<br />
                  Become a paid Substack member to unlock access.
                </div>
              ) : (
                <>
                  <input
                    type="number"
                    placeholder="Amount (Max 500 USDC)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full p-2 border border-gray-300 rounded mb-2"
                  />
                  {isValidAmount && (
                    <p className="text-sm text-gray-700 mb-2 font-semibold">
                      Fee: {(parsedAmount * 0.01).toFixed(2)} USDC • Vault: {(parsedAmount * 0.99).toFixed(2)} USDC
                    </p>
                  )}
                  <button
                    onClick={() => write?.()}
                    disabled={!write || isLoading || !isValidAmount}
                    className={`w-full p-2 rounded text-white ${
                      !write || isLoading || !isValidAmount
                        ? 'bg-gray-400'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isLoading ? 'Minting...' : 'Mint'}
                  </button>
                </>
              )}
              <button
                onClick={() => redeemWrite?.()}
                disabled={!redeemWrite || redeemLoading || !hasBalance}
                className={`mt-2 w-full p-2 rounded text-white ${
                  !redeemWrite || redeemLoading || !hasBalance
                    ? 'bg-gray-400'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {redeemLoading ? 'Redeeming...' : 'Redeem'}
              </button>

              <div className="mt-4 text-sm text-gray-800">
                <strong>USDEC Balance:</strong> {formattedBalance}
              </div>

              {txHash && (
                <div className="mt-2">
                  <a
                    href={`https://base-sepolia.blockscout.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View Transaction
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-6 text-center">
          <div className="bg-white bg-opacity-90 shadow-lg rounded-xl p-4 mb-6 max-w-sm w-full">
            <h3 className="text-md font-semibold text-gray-800 mb-1">Vault Info</h3>
            <p className="text-sm text-gray-700">Name: Arcadia USDC Vault</p>
            <p className="text-sm text-gray-700">Platform: Arcadia Finance</p>
            <p className="text-sm text-gray-700">Network: Base</p>
            <p className="text-xs text-blue-600 truncate mt-1">
              <a
                href="https://arcadia.finance/pool/8453/0x3ec4a293Fb906DD2Cd440c20dECB250DeF141dF1"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Today’s APY
              </a>
            </p>
          </div>
        </div>

        <div
          className="w-full max-w-2xl mt-6 p-4 rounded-lg"
          style={{
            background: 'linear-gradient(to right, #1a1a1a, #2c2c2c)',
          }}
        >
          <h3 className="text-lg font-semibold mb-2" style={{ color: '#bc9c22' }}>
            The Koru Symbol
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: '#bc9c22' }}>
            The Koru is a spiral derived from the unfurling frond of the silver fern.
            It symbolizes new life, growth, strength and peace. This yacht, named Koru,
            was built in 2023 and represents a journey toward new beginnings. In the
            creator economy, we honor the same spirit — evolving with purpose and
            navigating the open seas of ownership and opportunity.
          </p>
        </div>
      </div>
    </>
  );
}
