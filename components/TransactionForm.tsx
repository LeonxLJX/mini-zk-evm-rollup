import { useState, memo } from 'react';

interface TransactionFormProps {
  onSubmit: (to: string, value: string, data: string) => Promise<void>;
  isSubmitting: boolean;
}

const TransactionForm = memo(({ onSubmit, isSubmitting }: TransactionFormProps) => {
  const [to, setTo] = useState('');
  const [value, setValue] = useState('0');
  const [data, setData] = useState('0x');

  const handleSubmit = async () => {
    await onSubmit(to, value, data);
    setTo('');
    setValue('0');
    setData('0x');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">To</label>
          <input
            type="text"
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Value (wei)</label>
          <input
            type="text"
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Data</label>
          <input
            type="text"
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={data}
            onChange={(e) => setData(e.target.value)}
            placeholder="0x..."
          />
        </div>
        <button
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          onClick={handleSubmit}
          disabled={isSubmitting || !to}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Transaction'}
        </button>
      </div>
    </div>
  );
});

export default TransactionForm;
