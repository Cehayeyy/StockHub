import{r as h,j as e,H as L,a as C}from"./app-D8-zZicR.js";import{A as E,T as I,R,f as D}from"./app-layout-CzlxwNnQ.js";import{D as K}from"./download-DYD6krNw.js";import{c as f}from"./createLucideIcon-QpXZmc7t.js";import{S as U}from"./search-Crz47cvO.js";import"./package-B-0XShgU.js";/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=[["line",{x1:"18",x2:"18",y1:"20",y2:"10",key:"1xfpm4"}],["line",{x1:"12",x2:"12",y1:"20",y2:"4",key:"be30l9"}],["line",{x1:"6",x2:"6",y1:"20",y2:"14",key:"1r4le6"}]],F=f("ChartNoAxesColumn",O);/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=[["path",{d:"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",key:"96xj49"}]],z=f("Flame",B);function Q({selectedMonth:j,periodeFormatted:x,frekuensiItems:y=[]}){const[i,N]=h.useState(j||"2026-09"),[o,w]=h.useState(""),d=a=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(a),v=a=>!a||a.length===0?[]:a.map((t,b)=>{const s=Number(t.total_kuantitas)||0,g=Number(t.total_nominal)||0,A=s>0?Math.round(g/s):0,l=b+1;let n="Stabil";return l===1||s>=100?n="Sangat Laku":l<=3||s>=50?n="Laku":l<=7||s>=20?n="Stabil":l<=9?n="Perlu Evaluasi":n="Kurang Diminati",{id:b+1,peringkat:l,namaMenu:t.nama_item||"Menu Tanpa Nama",kategori:t.kategori||"Umum",hargaSatuan:A,totalTerjual:s,totalOmset:g,statusPopularitas:n}}),k=[{id:1,peringkat:1,namaMenu:"Paket Bebek Goreng",kategori:"Makanan Utama",hargaSatuan:4e4,totalTerjual:120,totalOmset:48e5,statusPopularitas:"Sangat Laku"},{id:2,peringkat:2,namaMenu:"Paket Ayam Goreng",kategori:"Makanan Utama",hargaSatuan:35e3,totalTerjual:95,totalOmset:3325e3,statusPopularitas:"Laku"}],c=v(y),r=c.length>0?c:k,P=r.filter(a=>a.namaMenu.toLowerCase().includes(o.toLowerCase())||a.kategori.toLowerCase().includes(o.toLowerCase())),m=r.reduce((a,t)=>a+t.totalTerjual,0),T=r.reduce((a,t)=>a+t.totalOmset,0),p=r[0]||{namaMenu:"-",totalTerjual:0},u=r[r.length-1]||{namaMenu:"-",totalTerjual:0},S=a=>{const t=a.target.value;N(t),C.get("/laporan/frekuensi-pembelian",{bulan:t},{preserveState:!0,preserveScroll:!0})},M=a=>{switch(a){case"Sangat Laku":return e.jsxs("span",{className:"inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200",children:[e.jsx("span",{className:"w-1.5 h-1.5 rounded-full bg-emerald-500"}),"Sangat Laku"]});case"Laku":return e.jsxs("span",{className:"inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200",children:[e.jsx("span",{className:"w-1.5 h-1.5 rounded-full bg-emerald-500"}),"Laku"]});case"Stabil":return e.jsxs("span",{className:"inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200",children:[e.jsx("span",{className:"w-1.5 h-1.5 rounded-full bg-blue-500"}),"Stabil"]});case"Perlu Evaluasi":return e.jsxs("span",{className:"inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200",children:[e.jsx("span",{className:"w-1.5 h-1.5 rounded-full bg-amber-500"}),"Perlu Evaluasi"]});case"Kurang Diminati":return e.jsxs("span",{className:"inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200",children:[e.jsx("span",{className:"w-1.5 h-1.5 rounded-full bg-red-500"}),"Kurang Diminati"]});default:return null}};return e.jsxs(E,{header:"Laporan Frekuensi Pembelian Menu (Bulanan)",children:[e.jsx(L,{title:"Laporan Frekuensi Pembelian Menu"}),e.jsx("style",{children:`
        @keyframes waveAnimation {
          0% { transform: translateY(0px) scale(1) rotate(0deg); }
          50% { transform: translateY(-8px) scale(1.05) rotate(2deg); }
          100% { transform: translateY(0px) scale(1) rotate(0deg); }
        }

        .wave-card {
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .wave-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.08);
        }

        @media print {
          /* Sembunyikan elemen navigasi & tombol */
          header, aside, button, select, input, .no-print {
            display: none !important;
          }

          /* Paksa orientasi kertas ke Landscape agar tabel muat sempurna */
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          body {
            background-color: white !important;
            color: black !important;
            font-size: 10pt !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Header khusus untuk versi PDF/Print */
          .print-header {
            display: block !important;
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }

          .print-header h1 {
            font-size: 16pt !important;
            font-weight: bold;
          }

          /* Atur tabel agar menyesuaikan lebar 100% tanpa scrollbar */
          table {
            width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
          }

          th, td {
            padding: 6px 10px !important;
            font-size: 9pt !important;
          }

          .summary-cards {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 10px !important;
            margin-bottom: 15px !important;
          }
        }

        .print-header {
          display: none;
        }
      `}),e.jsxs("div",{className:"space-y-6 pb-12 print-container",children:[e.jsxs("div",{className:"print-header",children:[e.jsx("h1",{children:"WARUNG CANGKRUK"}),e.jsx("p",{className:"text-xs text-gray-600",children:"Laporan Frekuensi Pembelian Menu (Popularitas Penjualan)"}),e.jsxs("p",{className:"text-xs font-semibold mt-1",children:["Periode: ",x||i]})]}),e.jsxs("div",{className:"flex flex-col gap-4 md:flex-row md:items-center md:justify-between no-print",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center gap-2 text-xs font-semibold text-gray-400 mb-1",children:[e.jsx("span",{children:"Laporan"}),e.jsx("span",{children:"›"}),e.jsx("span",{className:"text-gray-600",children:"Frekuensi Pembelian Bulanan"})]}),e.jsx("h1",{className:"text-2xl font-bold text-gray-900",children:"Laporan Frekuensi Pembelian Menu (Bulanan)"}),e.jsx("p",{className:"text-sm text-gray-500 mt-0.5",children:"Peringkat popularitas dan akumulasi penjualan menu dalam satu bulan."})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("input",{type:"month",value:i,onChange:S,className:"rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"}),e.jsxs("button",{type:"button",onClick:()=>window.print(),className:"flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer",children:[e.jsx(K,{className:"h-4 w-4"}),"Export PDF"]})]})]}),e.jsxs("div",{className:"grid grid-cols-1 gap-5 md:grid-cols-3 summary-cards",children:[e.jsxs("div",{className:"wave-card rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/20 to-blue-50/40 p-5 shadow-xs flex items-center justify-between group",children:[e.jsxs("div",{className:"space-y-1 relative z-10",children:[e.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-gray-400",children:"TOTAL PORSI TERJUAL"}),e.jsxs("h3",{className:"text-3xl font-black text-gray-900",children:[m," ",e.jsx("span",{className:"text-lg font-bold",children:"Porsi"})]}),e.jsxs("div",{className:"inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600 mt-1",children:[e.jsx(I,{className:"h-3 w-3"}),"Realisasi Penjualan Nota"]})]}),e.jsx("div",{className:"rounded-2xl bg-blue-50 p-3 text-blue-600 no-print",children:e.jsx(R,{className:"h-6 w-6"})})]}),e.jsxs("div",{className:"wave-card rounded-2xl border border-amber-100 bg-gradient-to-br from-white via-amber-50/20 to-amber-50/40 p-5 shadow-xs flex items-center justify-between group",children:[e.jsxs("div",{className:"space-y-1 relative z-10",children:[e.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-gray-400",children:"MENU TERLARIS (#1)"}),e.jsx("h3",{className:"text-xl font-extrabold text-emerald-600",children:p.namaMenu}),e.jsxs("p",{className:"text-xs text-gray-500 font-semibold flex items-center gap-1 mt-1",children:[e.jsx("span",{children:"🏆"})," ",p.totalTerjual," Porsi terjual"]})]}),e.jsx("div",{className:"rounded-2xl bg-amber-50 p-3 text-amber-500 no-print",children:e.jsx(z,{className:"h-6 w-6"})})]}),e.jsxs("div",{className:"wave-card rounded-2xl border border-red-100 bg-gradient-to-br from-white via-red-50/20 to-red-50/40 p-5 shadow-xs flex items-center justify-between group",children:[e.jsxs("div",{className:"space-y-1 relative z-10",children:[e.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-gray-400",children:"KURANG DIMINATI"}),e.jsx("h3",{className:"text-xl font-extrabold text-red-500",children:u.namaMenu}),e.jsxs("div",{className:"inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-500 mt-1",children:[e.jsx("span",{children:"↓"})," Hanya ",u.totalTerjual," Porsi terjual"]})]}),e.jsx("div",{className:"rounded-2xl bg-red-50 p-3 text-red-400 no-print",children:e.jsx(D,{className:"h-6 w-6"})})]})]}),e.jsxs("div",{className:"rounded-2xl border border-gray-100 bg-white shadow-xs overflow-hidden",children:[e.jsxs("div",{className:"flex flex-col gap-4 border-b border-gray-100 px-6 py-4 md:flex-row md:items-center md:justify-between bg-white",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"rounded-xl bg-amber-50 p-2 text-[#8B5E3C] no-print",children:e.jsx(F,{className:"h-5 w-5"})}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("h2",{className:"font-bold text-gray-800 text-base",children:["Peringkat Popularitas Menu – ",x||i]}),e.jsxs("span",{className:"rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600 no-print",children:[r.length," Menu Terdaftar"]})]})]}),e.jsxs("div",{className:"relative w-full md:w-64 no-print",children:[e.jsx(U,{className:"absolute left-3 top-2.5 h-4 w-4 text-gray-400"}),e.jsx("input",{type:"text",value:o,onChange:a=>w(a.target.value),placeholder:"Cari menu...",className:"w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-4 py-2 text-xs font-semibold text-gray-700 focus:bg-white focus:border-[#8B5E3C] focus:ring-2 focus:ring-[#8B5E3C]/20 focus:outline-none"})]})]}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full text-left text-sm",children:[e.jsx("thead",{className:"bg-gray-50/50 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 border-b border-gray-100",children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-6 py-3.5 text-center w-20",children:"PERINGKAT"}),e.jsx("th",{className:"px-6 py-3.5",children:"NAMA MENU"}),e.jsx("th",{className:"px-6 py-3.5 text-right",children:"ESTIMASI HARGA"}),e.jsx("th",{className:"px-6 py-3.5 text-center",children:"TOTAL TERJUAL"}),e.jsx("th",{className:"px-6 py-3.5 text-right",children:"TOTAL OMSET"}),e.jsx("th",{className:"px-6 py-3.5 text-center",children:"STATUS POPULARITAS"})]})}),e.jsx("tbody",{className:"divide-y divide-gray-100 font-semibold text-gray-700",children:P.map(a=>e.jsxs("tr",{className:"hover:bg-gray-50/80 transition-colors",children:[e.jsx("td",{className:"px-6 py-4 text-center",children:e.jsxs("span",{className:`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${a.peringkat===1?"bg-amber-100 text-amber-800 border border-amber-300":a.peringkat===2?"bg-slate-200 text-slate-700 border border-slate-300":a.peringkat===3?"bg-amber-50 text-amber-700 border border-amber-200":"text-gray-400"}`,children:["#",a.peringkat]})}),e.jsxs("td",{className:"px-6 py-4",children:[e.jsx("div",{className:`font-bold ${a.statusPopularitas==="Kurang Diminati"?"text-red-500":"text-gray-900"}`,children:a.namaMenu}),e.jsxs("div",{className:"text-[11px] font-semibold text-gray-400",children:["Kategori: ",a.kategori]})]}),e.jsx("td",{className:"px-6 py-4 text-right text-gray-500",children:d(a.hargaSatuan)}),e.jsx("td",{className:"px-6 py-4 text-center",children:e.jsxs("span",{className:`font-bold ${a.statusPopularitas==="Kurang Diminati"?"text-red-500":"text-gray-900"}`,children:[a.totalTerjual," porsi"]})}),e.jsx("td",{className:"px-6 py-4 text-right",children:e.jsx("span",{className:`font-extrabold ${a.statusPopularitas==="Kurang Diminati"?"text-red-500":"text-gray-900"}`,children:d(a.totalOmset)})}),e.jsx("td",{className:"px-6 py-4 text-center",children:M(a.statusPopularitas)})]},a.id))}),e.jsx("tfoot",{className:"bg-gray-50/80 font-extrabold text-gray-900 border-t border-gray-200",children:e.jsxs("tr",{children:[e.jsx("td",{colSpan:3,className:"px-6 py-4",children:"Total Keseluruhan"}),e.jsxs("td",{className:"px-6 py-4 text-center text-base",children:[m," Porsi"]}),e.jsx("td",{className:"px-6 py-4 text-right text-lg text-blue-600",children:d(T)}),e.jsx("td",{})]})})]})})]})]})]})}export{Q as default};
