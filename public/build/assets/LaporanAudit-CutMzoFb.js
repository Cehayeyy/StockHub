import{j as e,H as p}from"./app-D8-zZicR.js";import{A as b}from"./app-layout-CzlxwNnQ.js";import"./createLucideIcon-QpXZmc7t.js";import"./package-B-0XShgU.js";function N({item_duplikat:i,resep_tanpa_bahan:n,bahan_nganggur:o}){const x=()=>{const a=new Date,r=a.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}),h=a.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});let t=`
            <html xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: 'Calibri', sans-serif; }
                    .header-title { font-size: 20px; font-weight: bold; color: #1f2937; text-align: center; }
                    .header-subtitle { font-size: 14px; color: #4b5563; text-align: center; margin-bottom: 20px; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 30px; font-size: 14px; }
                    th { font-weight: bold; background-color: #f3f4f6; border: 1px solid #d1d5db; padding: 10px; text-align: center; text-transform: uppercase; }
                    td { border: 1px solid #d1d5db; padding: 8px 10px; text-transform: capitalize; }
                    h2 { font-size: 16px; margin-bottom: 8px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
                    .text-center { text-align: center; }
                    .text-danger { color: #dc2626; font-weight: bold; }
                    .empty-row { font-style: italic; color: #16a34a; font-weight: bold; text-align: center; background-color: #f0fdf4; }
                </style>
            </head>
            <body>
                <div class="header-title">LAPORAN AUDIT & VALIDASI DATA</div>
                <div class="header-subtitle">WARUNG CANGKRUK</div>
                <div class="header-subtitle">Tanggal Tarik: ${r} - ${h} WIB</div>
                <br>
        `;t+="<h2> 1. DATA ITEM GANDA / TERDUPLIKAT </h2>",t+=`<table>
            <tr>
                <th style="width: 40px;">No</th>
                <th style="width: 250px;">Nama Item</th>
                <th style="width: 150px;">Divisi</th>
                <th style="width: 150px;">Kategori</th>
                <th style="width: 150px;">Status</th>
            </tr>`,i.length>0?i.forEach((s,l)=>{t+=`<tr>
                    <td class="text-center">${l+1}</td>
                    <td>${s.nama}</td>
                    <td class="text-center">${s.division}</td>
                    <td class="text-center">${s.kategori}</td>
                    <td class="text-center text-danger">${s.jumlah} Kali Input</td>
                </tr>`}):t+='<tr><td colspan="5" class="empty-row">Aman! Tidak ada item ganda yang ditemukan.</td></tr>',t+="</table>",t+="<h2> 2. MENU TANPA PENGATURAN RESEP </h2>",t+=`<table>
            <tr>
                <th style="width: 40px;">No</th>
                <th style="width: 300px;">Nama Menu</th>
                <th style="width: 150px;">Divisi</th>
            </tr>`,n.length>0?n.forEach((s,l)=>{t+=`<tr>
                    <td class="text-center">${l+1}</td>
                    <td>${s.name}</td>
                    <td class="text-center">${s.division}</td>
                </tr>`}):t+='<tr><td colspan="3" class="empty-row">Aman! Semua menu sudah memiliki resep bahan.</td></tr>',t+="</table>",t+="<h2> 3. BAHAN MENTAH BELUM MASUK RESEP </h2>",t+=`<table>
            <tr>
                <th style="width: 40px;">No</th>
                <th style="width: 300px;">Nama Bahan Mentah</th>
                <th style="width: 150px;">Kategori</th>
                <th style="width: 150px;">Divisi</th>
            </tr>`,o.length>0?o.forEach((s,l)=>{t+=`<tr>
                    <td class="text-center">${l+1}</td>
                    <td>${s.nama}</td>
                    <td class="text-center">${s.kategori}</td>
                    <td class="text-center">${s.division}</td>
                </tr>`}):t+='<tr><td colspan="4" class="empty-row">Aman! Seluruh bahan mentah sudah terpakai di resep.</td></tr>',t+="</table></body></html>";const m=new Blob([t],{type:"application/vnd.ms-excel"}),c=URL.createObjectURL(m),d=document.createElement("a");d.setAttribute("href",c),d.setAttribute("download",`Audit_Data_Warung_${new Date().toISOString().split("T")[0]}.xls`),document.body.appendChild(d),d.click(),document.body.removeChild(d),URL.revokeObjectURL(c)};return e.jsxs(b,{header:"Pusat Kontrol Data",children:[e.jsx(p,{title:"Pusat Kontrol Data"}),e.jsx("div",{className:"py-6",children:e.jsxs("div",{className:"bg-[#F2ECE4] p-4 md:p-8 rounded-3xl shadow-sm border border-amber-200/60 min-h-[600px] flex flex-col space-y-6",children:[e.jsxs("div",{className:"flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-3xl shadow-xs border border-gray-100 border-l-4 border-amber-500 gap-4",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2",children:"🔍 Pusat Kontrol & Validasi Data"}),e.jsx("p",{className:"text-gray-500 text-xs sm:text-sm mt-1",children:"Periksa potensi kesalahan input atau data yang belum lengkap sebelum masuk ke laporan harian."})]}),e.jsx("button",{onClick:x,className:"bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-sm transition flex items-center gap-2 text-xs sm:text-sm flex-shrink-0 active:scale-95",children:"📥 Download Laporan (.xls)"})]}),e.jsxs("div",{className:"bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden",children:[e.jsxs("div",{className:"bg-rose-50/70 px-6 py-4 border-b border-rose-100",children:[e.jsx("h2",{className:"text-base font-bold text-rose-800",children:"1. Data Item Ganda / Terduplikat"}),e.jsx("p",{className:"text-xs text-rose-600 mt-0.5",children:"Item berikut tercatat lebih dari sekali di sistem. Silakan hapus data yang tidak perlu lewat menu Data Induk."})]}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full text-left text-sm whitespace-nowrap",children:[e.jsx("thead",{className:"bg-[#FAF7F2]/80 text-gray-500 font-bold uppercase text-[11px] tracking-wider border-b border-gray-100",children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-6 py-4",children:"Nama Item"}),e.jsx("th",{className:"px-6 py-4",children:"Divisi"}),e.jsx("th",{className:"px-6 py-4",children:"Jumlah Terdaftar"})]})}),e.jsx("tbody",{className:"divide-y divide-gray-50",children:i.length>0?i.map((a,r)=>e.jsxs("tr",{className:"hover:bg-rose-50/30 transition-colors",children:[e.jsx("td",{className:"px-6 py-4 font-bold text-gray-800",children:a.nama}),e.jsx("td",{className:"px-6 py-4 text-gray-600 uppercase font-medium",children:a.division}),e.jsxs("td",{className:"px-6 py-4 text-rose-600 font-bold",children:[a.jumlah," Kali"]})]},r)):e.jsx("tr",{children:e.jsx("td",{colSpan:3,className:"px-6 py-10 text-center text-emerald-600 font-bold text-sm bg-emerald-50/20",children:"✨ Aman! Tidak ada item ganda yang ditemukan."})})})]})})]}),e.jsxs("div",{className:"bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden",children:[e.jsxs("div",{className:"bg-amber-50/70 px-6 py-4 border-b border-amber-100",children:[e.jsx("h2",{className:"text-base font-bold text-amber-900",children:"2. Menu Tanpa Pengaturan Resep"}),e.jsx("p",{className:"text-xs text-amber-700 mt-0.5",children:"Menu ini belum diatur komposisi bahan mentahnya. Jika dibiarkan, stok kasir tidak akan berkurang saat terjual."})]}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full text-left text-sm whitespace-nowrap",children:[e.jsx("thead",{className:"bg-[#FAF7F2]/80 text-gray-500 font-bold uppercase text-[11px] tracking-wider border-b border-gray-100",children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-6 py-4",children:"Nama Menu"}),e.jsx("th",{className:"px-6 py-4",children:"Divisi"})]})}),e.jsx("tbody",{className:"divide-y divide-gray-50",children:n.length>0?n.map((a,r)=>e.jsxs("tr",{className:"hover:bg-amber-50/30 transition-colors",children:[e.jsx("td",{className:"px-6 py-4 font-bold text-gray-800",children:a.name}),e.jsx("td",{className:"px-6 py-4 text-gray-600 uppercase font-medium",children:a.division})]},r)):e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"px-6 py-10 text-center text-emerald-600 font-bold text-sm bg-emerald-50/20",children:"✨ Aman! Semua menu sudah memiliki resep bahan."})})})]})})]}),e.jsxs("div",{className:"bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden",children:[e.jsxs("div",{className:"bg-yellow-50/70 px-6 py-4 border-b border-yellow-100",children:[e.jsx("h2",{className:"text-base font-bold text-yellow-900",children:"3. Bahan Mentah Belum Masuk Resep"}),e.jsx("p",{className:"text-xs text-yellow-700 mt-0.5",children:"Bahan ini sudah terdaftar di sistem, tapi belum pernah dimasukkan ke dalam racikan resep menu manapun."})]}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full text-left text-sm whitespace-nowrap",children:[e.jsx("thead",{className:"bg-[#FAF7F2]/80 text-gray-500 font-bold uppercase text-[11px] tracking-wider border-b border-gray-100",children:e.jsxs("tr",{children:[e.jsx("th",{className:"px-6 py-4",children:"Nama Bahan Mentah"}),e.jsx("th",{className:"px-6 py-4",children:"Divisi"})]})}),e.jsx("tbody",{className:"divide-y divide-gray-50",children:o.length>0?o.map((a,r)=>e.jsxs("tr",{className:"hover:bg-yellow-50/30 transition-colors",children:[e.jsx("td",{className:"px-6 py-4 font-bold text-gray-800",children:a.nama}),e.jsx("td",{className:"px-6 py-4 text-gray-600 uppercase font-medium",children:a.division})]},r)):e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"px-6 py-10 text-center text-emerald-600 font-bold text-sm bg-emerald-50/20",children:"✨ Aman! Seluruh bahan mentah sudah terpakai di resep."})})})]})})]})]})})]})}export{N as default};
