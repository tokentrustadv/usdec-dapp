import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useContractWrite, usePrepareContractWrite } from 'wagmi';
import usdecAbi from '../usdecAbi.json';

const USDEC_ADDRESS = '0x5F66c05F739FbD5dE34cCB5e60d4269F16Dc6F65'; // your contract

export default function Home() {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [parsedAmount, setParsedAmount] = useState(null);

  useEffect(() => {
    const value = parseFloat(amount);
    if (!isNaN(value) && value > 0 && value <= 500) {
      setParsedAmount(BigInt(value * 1e6)); // assuming USDC has 6 decimals
    } else {
      setParsedAmount(null);
    }
  }, [amount]);

  const { config } = usePrepareContractWrite({
    address: USDEC_ADDRESS,
    abi: usdecAbi,
    functionName: 'mint',
    args: parsedAmount ? [parsedAmount] : undefined,
    enabled: Boolean(parsedAmount) && isConnected,
  });

  const { write, isLoading } = useContractWrite(config);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>USDEC Testnet App</h1>
      <ConnectButton />
      {isConnected && (
        <div style={{ marginTop: '2rem' }}>
          <input
            id="usdc-amount"
            type="number"
            placeholder="Amount (Max 500 USDC)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
            style={{ padding: '0.5rem', fontSize: '16px' }}
          />
          <button
            onClick={() => write?.()}
            disabled={!write || isLoading}
            style={{
              marginLeft: '1rem',
              padding: '0.5rem 1rem',
              fontSize: '16px',
              backgroundColor: (!write || isLoading) ? '#ccc' : '#0070f3',
              color: 'white',
              border: 'none',
              cursor: (!write || isLoading) ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? 'Minting...' : 'Mint USDEC'}
          </button>
        </div>
      )}
    </div>
  );
}
