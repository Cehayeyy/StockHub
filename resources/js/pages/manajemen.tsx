import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function Manajemen() {
    // Pastikan users memiliki struktur paginasi atau array biasa
    // Jika backend mengirim Paginator, users.data adalah array-nya
    // Jika backend mengirim collection, users adalah array-nya
    const { users, csrf_token, errors }: any = usePage().props;

    // Normalisasi data user (apakah paginate atau collection biasa)
    const userList = users.data || users;
    const links = users.links || []; // Ambil link pagination jika ada

    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const [editId, setEditId] = useState<number | null>(null);

    const [role, setRole] = useState('');
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');

    // Helper: hitung username berikutnya berdasarkan role & data users
    const getNextUsername = (roleValue: string) => {
        if (!roleValue) return '';

        const prefix = roleValue.toLowerCase(); // bar, kitchen, supervisor

        const sameRoleUsers = (userList || []).filter(
            (u: any) => (u.role || '').toLowerCase() === prefix
        );

        let max = 0;

        sameRoleUsers.forEach((u: any) => {
            const uname = (u.username || '').toLowerCase();
            const regex = new RegExp('^' + prefix + '(\\d+)$');
            const match = uname.match(regex);
            if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > max) {
                    max = num;
                }
            }
        });

        return `${prefix}${max + 1}`;
    };

    // --- OPEN MODAL TAMBAH ---
    const openModal = () => {
        setRole('');
        setUsername('');
        setName('');
        setPassword('');
        setShowModal(true);
    };

    // --- SAVE / STORE ---
    const handleSave = (e: any) => {
        e.preventDefault();

        router.post(
            route('users.store'),
            {
                role,
                username,
                name,
                password,
            },
            {
                preserveScroll: true,
                onSuccess: () => setShowModal(false),
            }
        );
    };

    // --- OPEN EDIT MODAL ---
    const openEditModal = (u: any) => {
        setEditId(u.id);
        setRole(u.role);
        setUsername(u.username);
        setName(u.name || '');
        // jangan isi password lama (hash) ke input
        setPassword('');
        setShowEditModal(true);
    };

    // --- UPDATE USER ---
    const handleUpdate = (e: any) => {
        e.preventDefault();
        if (!editId) return;

        router.put(
            route('manajemen.update', editId),
            {
                role,
                username,
                name,
                password, // kosong = tidak diubah
            },
            {
                preserveScroll: true,
                onSuccess: () => setShowEditModal(false),
            }
        );
    };

    // --- DELETE ---
    const openDeleteModal = (id: number) => {
        setDeleteId(id);
        setConfirmDelete(true);
    };

    const handleDelete = () => {
        if (!deleteId) return;

        router.delete(route('manajemen.destroy', deleteId), {
            preserveScroll: true,
            onSuccess: () => {
                setConfirmDelete(false);
                setDeleteId(null);
            },
        });
    };

    return (
        <AppLayout header="Manajemen Akun">
            <Head title="Manajemen Akun" />

            <div className="py-6">
                <div className={`bg-white p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[600px] flex flex-col ${
                        showModal || confirmDelete || showEditModal ? 'blur-sm pointer-events-none' : ''
                    }`}
                >
                    {/* --- HEADER --- */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h3 className="text-lg font-bold text-gray-800">Daftar Pengguna</h3>

                        <button
                            onClick={openModal}
                            className="flex items-center gap-2 bg-[#D9A978] text-white px-5 py-2 rounded-full text-sm font-bold shadow-md hover:bg-[#c4925e] transition"
                        >
                            <Plus className="w-4 h-4" />
                            Tambah Akun
                        </button>
                    </div>

                    {/* --- TABEL (TANPA SCROLL VERTICAL) --- */}
                    {/* Menggunakan overflow-x-auto agar responsif horizontal */}
                    <div className="w-full rounded-xl border border-gray-100 bg-white overflow-hidden flex-1 mb-6">
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 w-16 text-center">No</th>
                                        <th className="px-6 py-4">Username</th>
                                        <th className="px-6 py-4">Nama</th>
                                        <th className="px-6 py-4 text-center">Role</th>
                                        <th className="px-6 py-4 text-center">Dibuat</th>
                                        <th className="px-6 py-4 text-center w-32">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {userList.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                                                Belum ada pengguna.
                                            </td>
                                        </tr>
                                    ) : (
                                        userList.map((u: any, index: number) => (
                                            <tr key={u.id} className="hover:bg-[#FFF9F0] transition">
                                                <td className="px-6 py-4 text-center text-gray-500">
                                                    {/* Jika paginate, sesuaikan nomor urut */}
                                                    {users.current_page
                                                        ? (users.current_page - 1) * users.per_page + index + 1
                                                        : index + 1}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-800">
                                                    {u.username || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {u.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 uppercase tracking-wide">
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-gray-500">
                                                    {new Date(u.created_at).toLocaleDateString('id-ID')}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => openEditModal(u)}
                                                            className="bg-[#1D8CFF] text-white px-3 py-1 rounded-full text-xs font-semibold hover:bg-[#166ac4] transition"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteModal(u.id)}
                                                            className="bg-[#FF4B4B] text-white px-3 py-1 rounded-full text-xs font-semibold hover:bg-[#e03535] transition"
                                                        >
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* --- PAGINATION (DILUAR TABEL) --- */}
                    {links.length > 3 && (
                        <div className="mt-auto flex justify-center md:justify-end">
                            <nav className="inline-flex rounded-md shadow-sm -space-x-px bg-white">
                                {links.map((link: any, i: number) => {
                                    let label = link.label;
                                    if (label.includes('&laquo;')) label = 'Prev';
                                    if (label.includes('&raquo;')) label = 'Next';

                                    return (
                                        <button
                                            key={i}
                                            disabled={!link.url}
                                            onClick={() => {
                                                if (link.url) {
                                                    router.get(link.url, {}, { preserveState: true });
                                                }
                                            }}
                                            className={`
                                                relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors
                                                ${i === 0 ? 'rounded-l-md' : ''}
                                                ${i === links.length - 1 ? 'rounded-r-md' : ''}
                                                ${
                                                    link.active
                                                        ? 'z-10 bg-[#D9A978] border-[#D9A978] text-white hover:bg-[#c4925e]'
                                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                }
                                                ${!link.url ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}
                                            `}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    )}

                </div>
            </div>

            {/* ===================== MODAL TAMBAH ===================== */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    <div className="bg-white rounded-3xl shadow-xl w-[380px] p-8 animate-fadeIn">
                        <h2 className="text-xl font-bold text-center mb-6 text-gray-800">
                            Tambah Akun Baru
                        </h2>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Bagian
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setRole(value);
                                        setUsername(value ? getNextUsername(value) : '');
                                    }}
                                    className="w-full bg-gray-50 rounded-xl px-4 py-2 border border-gray-200 focus:ring-2 focus:ring-[#D9A978] outline-none"
                                    required
                                >
                                    <option value="">-- Pilih Bagian --</option>
                                    <option value="bar">Bar</option>
                                    <option value="kitchen">Kitchen</option>
                                    <option value="supervisor">Supervisor</option>
                                </select>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                                    Kode Username (Otomatis)
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    readOnly
                                    className="w-full bg-transparent font-mono text-lg font-bold text-gray-800 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Nama Lengkap
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-gray-50 rounded-xl px-4 py-2 border border-gray-200 focus:ring-2 focus:ring-[#D9A978] outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-gray-50 rounded-xl px-4 py-2 border border-gray-200 focus:ring-2 focus:ring-[#D9A978] outline-none"
                                    required
                                />
                            </div>

                            <div className="pt-4 flex justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 rounded-xl bg-[#D9A978] text-white font-bold hover:bg-[#c4925e] transition"
                                >
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===================== MODAL EDIT USER ===================== */}
            {showEditModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    <div className="bg-white rounded-3xl shadow-xl w-[380px] p-8 animate-fadeIn">
                        <h2 className="text-xl font-bold text-center mb-6 text-gray-800">
                            Edit Akun
                        </h2>

                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Bagian
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full bg-gray-50 rounded-xl px-4 py-2 border border-gray-200 focus:ring-2 focus:ring-[#D9A978] outline-none"
                                    required
                                >
                                    <option value="bar">Bar</option>
                                    <option value="kitchen">Kitchen</option>
                                    <option value="supervisor">Supervisor</option>
                                </select>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                                    Kode Username
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-transparent font-mono text-lg font-bold text-gray-800 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Nama Lengkap
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-gray-50 rounded-xl px-4 py-2 border border-gray-200 focus:ring-2 focus:ring-[#D9A978] outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Password (Opsional)
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-gray-50 rounded-xl px-4 py-2 border border-gray-200 focus:ring-2 focus:ring-[#D9A978] outline-none"
                                    placeholder="Isi jika ingin mengubah"
                                />
                            </div>

                            <div className="pt-4 flex justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 rounded-xl bg-[#1D8CFF] text-white font-bold hover:bg-[#166ac4] transition"
                                >
                                    Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===================== MODAL DELETE ===================== */}
            {confirmDelete && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    <div className="bg-white rounded-3xl shadow-xl w-[360px] p-8 text-center animate-fadeIn">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Hapus Akun?</h2>
                        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                            Anda yakin ingin menghapus user ini? Tindakan ini tidak dapat dibatalkan.
                        </p>

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setConfirmDelete(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition"
                            >
                                Batal
                            </button>

                            <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition"
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
