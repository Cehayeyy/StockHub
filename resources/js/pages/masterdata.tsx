import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Search, Package, Box, Filter } from 'lucide-react';

interface ItemData {
  id: number;
  division: 'Bar' | 'Dapur';
  category: 'Finish' | 'Semi finish' | 'Raw';
  categoryName: string;
  itemName: string;
  qty: number;
}

export default function MasterData() {
  // --- STATE ---
  const [activeDivision, setActiveDivision] = useState<'Bar' | 'Dapur'>('Bar');
  const [activeCategory, setActiveCategory] = useState<'Finish' | 'Semi finish' | 'Raw'>('Finish');
  const [searchQuery, setSearchQuery] = useState('');

  // --- DATA DUMMY ---
  const allItems: ItemData[] = [
    // --- BAR : FINISH ---
    { id: 1, division: 'Bar', category: 'Finish', categoryName: 'Finish', itemName: 'Es teh manis', qty: 45 },
    { id: 2, division: 'Bar', category: 'Finish', categoryName: 'Finish', itemName: 'Teh panas', qty: 15 },
    { id: 3, division: 'Bar', category: 'Finish', categoryName: 'Finish', itemName: 'Kopi hitam', qty: 10 },
    { id: 4, division: 'Bar', category: 'Finish', categoryName: 'Finish', itemName: 'Coklat', qty: 30 },
    { id: 5, division: 'Bar', category: 'Finish', categoryName: 'Finish', itemName: 'Matcha', qty: 26 },
    { id: 6, division: 'Bar', category: 'Finish', categoryName: 'Finish', itemName: 'Milkshake', qty: 4 },

    // --- BAR : SEMI FINISH ---
    { id: 7, division: 'Bar', category: 'Semi finish', categoryName: 'Semi finish', itemName: 'Cold brew', qty: 5 },
    { id: 8, division: 'Bar', category: 'Semi finish', categoryName: 'Semi finish', itemName: 'Syrup', qty: 26 },
    { id: 9, division: 'Bar', category: 'Semi finish', categoryName: 'Semi finish', itemName: 'Milk foam', qty: 18 },
    { id: 10, division: 'Bar', category: 'Semi finish', categoryName: 'Semi finish', itemName: 'Teh konsentrat', qty: 20 },
    { id: 11, division: 'Bar', category: 'Semi finish', categoryName: 'Semi finish', itemName: 'Lemon infused', qty: 10 },
    { id: 12, division: 'Bar', category: 'Semi finish', categoryName: 'Semi finish', itemName: 'Jeruk konsentrat', qty: 24 },

    // --- BAR : RAW ---
    { id: 13, division: 'Bar', category: 'Raw', categoryName: 'Raw', itemName: 'Es batu', qty: 10 },
    { id: 14, division: 'Bar', category: 'Raw', categoryName: 'Raw', itemName: 'Krimer', qty: 20 },
    { id: 15, division: 'Bar', category: 'Raw', categoryName: 'Raw', itemName: 'Coklat bubuk', qty: 2 },
    { id: 16, division: 'Bar', category: 'Raw', categoryName: 'Raw', itemName: 'Matcha powder', qty: 8 },
    { id: 17, division: 'Bar', category: 'Raw', categoryName: 'Raw', itemName: 'Kopi bubuk', qty: 13 },
    { id: 18, division: 'Bar', category: 'Raw', categoryName: 'Raw', itemName: 'Gula pasir', qty: 15 },

    // --- DAPUR ---
    { id: 19, division: 'Dapur', category: 'Finish', categoryName: 'Finish', itemName: 'Nasi Goreng', qty: 30 },
    { id: 20, division: 'Dapur', category: 'Raw', categoryName: 'Raw', itemName: 'Beras', qty: 50 },
  ];

  const filteredItems = allItems.filter(item => {
    const matchesDivision = item.division === activeDivision;
    const matchesCategory = item.category === activeCategory;
    const matchesSearch = item.itemName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDivision && matchesCategory && matchesSearch;
  });

  const headerTitle = `Master data ${activeCategory.toLowerCase()}`;

  return (
    <AppLayout header={headerTitle}>
      <Head title={headerTitle} />

      <div className="space-y-6">

        {/* --- BAGIAN ATAS: TAB DIVISI & SEARCH --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex space-x-1 bg-white p-1 rounded-lg border border-gray-200 w-full md:w-auto">
            <button
              onClick={() => setActiveDivision('Bar')}
              className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold transition-all duration-200 rounded-md
                ${activeDivision === 'Bar'
                  ? 'bg-[#5D4037] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Bar
            </button>
            <button
              onClick={() => setActiveDivision('Dapur')}
              className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold transition-all duration-200 rounded-md
                ${activeDivision === 'Dapur'
                  ? 'bg-[#5D4037] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Dapur
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Cari item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 rounded-full border border-gray-300 bg-white text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-[#DABA93] focus:border-transparent transition-all text-sm shadow-sm"
            />
            <div className="absolute inset-y-0 right-0 pr-1 flex items-center pointer-events-none">
              <div className="bg-[#DABA93] rounded-full p-1.5 mr-1">
                 <Search className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* --- BAGIAN TENGAH: BUTTON KATEGORI --- */}
        <div className="bg-white border border-gray-200 rounded-lg p-1 flex justify-between shadow-sm overflow-x-auto">
           {(['Finish', 'Semi finish', 'Raw'] as const).map((category) => (
             <button
               key={category}
               onClick={() => setActiveCategory(category)}
               className={`flex-1 py-2 px-2 text-center text-sm font-semibold rounded-md transition-all duration-200 whitespace-nowrap
                 ${activeCategory === category
                   ? 'bg-gray-100 text-gray-900 border border-gray-200 shadow-sm'
                   : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
             >
               {category}
             </button>
           ))}
        </div>

        {/* --- MOBILE VIEW (CARDS) --- */}
        {/* Tampil di layar kecil (< md) */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-50 p-2 rounded-lg text-[#DABA93]">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">{item.itemName}</h4>
                      <span className="text-xs text-gray-500">{item.division} - {item.categoryName}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                    No. {index + 1}
                  </span>
                </div>

                <div className="mt-3 flex justify-between items-center border-t border-gray-100 pt-3">
                  <span className="text-xs text-gray-500 font-medium">Quantity</span>
                  <span className="text-sm font-bold text-gray-800 bg-gray-50 px-3 py-1 rounded-md border border-gray-200">
                    {item.qty}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 text-sm">Tidak ada data ditemukan</p>
            </div>
          )}
        </div>

        {/* --- DESKTOP VIEW (TABLE) --- */}
        {/* Tampil di layar sedang ke atas (md:block) */}
        <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-900 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-bold w-16 text-center">No</th>
                  <th className="px-6 py-4 font-bold">Nama Kategori</th>
                  <th className="px-6 py-4 font-bold">Item</th>
                  <th className="px-6 py-4 font-bold text-center">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-500 text-center">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-medium">
                        {item.categoryName}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {item.itemName}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-gray-700">
                        {item.qty}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      Tidak ada data ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
