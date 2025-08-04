import Link from 'next/link'
import { Package, Flame, Users, ShoppingCart } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Sol Levinson</h1>
              <span className="ml-2 text-lg text-gray-600">Inventory Dashboard</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Caskets Card */}
            <Link href="/caskets" className="group">
              <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Caskets
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          Manage Inventory
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm">
                    <span className="font-medium text-blue-600 group-hover:text-blue-500">
                      View all caskets →
                    </span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Urns Card */}
            <Link href="/urns" className="group">
              <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
			<Flame className="h-6 w-6 text-purple-600" />                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Urns
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          Manage Inventory
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm">
                    <span className="font-medium text-purple-600 group-hover:text-purple-500">
                      View all urns →
                    </span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Suppliers Card */}
            <Link href="/suppliers" className="group">
              <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Suppliers
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          Manage Contacts
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm">
                    <span className="font-medium text-green-600 group-hover:text-green-500">
                      View suppliers →
                    </span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Orders Card */}
            <Link href="/orders" className="group">
              <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ShoppingCart className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Orders
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          Track Orders
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm">
                    <span className="font-medium text-orange-600 group-hover:text-orange-500">
                      View orders →
                    </span>
                  </div>
                </div>
              </div>
            </Link>

          </div>
        </div>
      </main>
    </div>
  )
}