import { ArrowUpRight, ArrowDownLeft, RotateCcw, Clock } from 'lucide-react';

interface Transaction {
  id: string;
  name: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  icon: string;
  category: string;
}

interface RightSidebarProps {}

export default function RightSidebar({}: RightSidebarProps) {
  // Mock data - replace with real data
  const transactions: Transaction[] = [
    {
      id: '1',
      name: 'Dribbbleupper',
      date: '11 Nov',
      amount: 1100,
      type: 'income',
      icon: '🎨',
      category: 'Design',
    },
    {
      id: '2',
      name: 'Amazon prime subs',
      date: '11 Aug',
      amount: 900,
      type: 'expense',
      icon: '📦',
      category: 'Subscription',
    },
    {
      id: '3',
      name: 'Amazon prime RET',
      date: '11 Aug',
      amount: 900,
      type: 'income',
      icon: '📦',
      category: 'Refund',
    },
    {
      id: '4',
      name: 'Travel service',
      date: '10 Aug',
      amount: 2100,
      type: 'expense',
      icon: '✈️',
      category: 'Travel',
    },
    {
      id: '5',
      name: 'Equipment purchase',
      date: '10 Aug',
      amount: 1700,
      type: 'expense',
      icon: '🛒',
      category: 'Shopping',
    },
    {
      id: '6',
      name: 'AE Helper',
      date: '7 Aug',
      amount: 600,
      type: 'income',
      icon: '💼',
      category: 'Freelance',
    },
    {
      id: '7',
      name: 'Davis Rowen',
      date: '6 Aug',
      amount: 850,
      type: 'income',
      icon: '👤',
      category: 'Payment',
    },
  ];

  const totalIncome = 15000;
  const totalExpenses = 6700;
  const savedBalance = 8300;

  const cardNumber = '****  ****  ****  7910';
  const cardExpiry = '12/26';

  return (
    <aside className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* User Info & Add Widget */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
              M
            </div>
            <div>
              <p className="font-semibold text-gray-900">Michael Johnson</p>
              <p className="text-xs text-gray-500">m.johnson@acme.com</p>
            </div>
          </div>
          <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
            + Add widget
          </button>
        </div>

        {/* Card Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">My card</h3>
            <button className="text-sm text-gray-600 hover:text-gray-900">+ Add card</button>
          </div>

          <div className="space-y-3">
            {/* Debit Card */}
            <div className="relative bg-gradient-to-br from-green-400 to-green-500 rounded-xl p-4 text-white h-40 overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-xs font-medium">Debit card</span>
                  <span className="font-bold">VISA</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-6 bg-yellow-400 rounded"></div>
                    <p className="text-sm tracking-wider">{cardNumber}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Valid thru {cardExpiry}</span>
                  </div>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white opacity-10 rounded-full"></div>
            </div>

            {/* Credit Card */}
            <div className="relative bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl p-4 text-white h-40 overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-xs font-medium">Credit card</span>
                  <span className="font-bold">MASTERCARD</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-6 bg-yellow-400 rounded"></div>
                    <p className="text-sm tracking-wider">****  ****  ****  8392</p>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Valid thru 09/28</span>
                    <span>Michael John</span>
                  </div>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white opacity-5 rounded-full"></div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <button className="flex flex-col items-center space-y-1 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Topup</span>
            </button>
            <button className="flex flex-col items-center space-y-1 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Send</span>
            </button>
            <button className="flex flex-col items-center space-y-1 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Request</span>
            </button>
            <button className="flex flex-col items-center space-y-1 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">History</span>
            </button>
          </div>
        </div>

        {/* Quick Payment */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick payment</h3>
          <div className="flex items-center space-x-3">
            {['Davis', 'Ella', 'Leo', 'Amanda', 'Aro', 'Sai'].map((name, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                  {name[0]}
                </div>
                <span className="text-xs mt-1 text-gray-600">{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Total income</p>
            <p className="text-lg font-bold text-gray-900">MAD {totalIncome.toLocaleString()}</p>
            <p className="text-xs text-green-500">+8.5% from last month</p>
          </div>
          <div className="bg-white p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Total expenses</p>
            <p className="text-lg font-bold text-gray-900">MAD {totalExpenses.toLocaleString()}</p>
            <p className="text-xs text-gray-500">+2.3% from last month</p>
          </div>
          <div className="bg-white p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Saved balance</p>
            <p className="text-lg font-bold text-gray-900">MAD {savedBalance.toLocaleString()}</p>
            <p className="text-xs text-gray-500">+3% from last month</p>
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Transaction history</h3>
            <span className="text-xs text-gray-500">7d</span>
          </div>

          <div className="space-y-2">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-lg">
                    {transaction.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{transaction.name}</p>
                    <p className="text-xs text-gray-500">{transaction.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-gray-900'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}MAD {transaction.amount}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
