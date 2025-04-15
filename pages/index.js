import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useContractWrite, usePrepareContractWrite } from 'wagmi';
import usdecAbi from '../usdecAbi.json';

const USDEC_ADDRESS = '0x5F66c05F739FbD5dE34cCB5e60d4269F16Dc6F65'; // Replace with your deployed contract address

export default function Home() {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState('');

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= 500;

  const { config, error: prepareError } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'mint',
    enabled: isConnected && isValidAmount,
    args: isValidAmount ? [BigInt(parsedAmount * 1e6)] : undefined, // 6 decimals assumed
  });

  const { write, isLoading, error: writeError } = useContractWrite(config);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>USDEC Mint App (Base Sepolia)</h1>
      <ConnectButton />

      {isConnected && (
        <div style={{ marginTop: '2rem' }}>
          <input
            type="number"
            placeholder="Enter USDC amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            max="500"
            step="0.01"
          />
          <button
            style={{ marginLeft: '1rem' }}
            onClick={() => write?.()}
            disabled={!write || isLoading}
          >
            {isLoading ? 'Minting...' : 'Mint USDEC'}
          </button>

          {prepareError && (
            <p style={{ color: 'red' }}>⚠️ Prepare error: {prepareError.message}</p>
          )}
          {writeError && (
            <p style={{ color: 'red' }}>⚠️ Write error: {writeError.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
