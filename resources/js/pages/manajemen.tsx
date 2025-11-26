import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Manajemen() {
    const { users, csrf_token, errors }: any = usePage().props;

    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const [editId, setEditId] = useState<number | null>(null);

    const [role, setRole] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    // --- OPEN MODAL TAMBAH ---
    const openModal = () => {
        setRole("");
        setUsername("");
        setPassword("");
        setShowModal(true);
    };

    // --- SAVE / STORE ---
    const handleSave = (e: any) => {
        e.preventDefault();

        router.post(route('users.store'), {
            role,
            username,
            password,
        }, {
            preserveScroll: true,
            onSuccess: () => setShowModal(false)
        });
    };

    // --- OPEN EDIT MODAL ---
    const openEditModal = (u: any) => {
        setEditId(u.id);
        setRole(u.role);
        setUsername(u.username);
        setPassword(u.password); // password lama ditampilkan (dari server)
        setShowEditModal(true);
    };

    // --- UPDATE USER ---
    const handleUpdate = (e: any) => {
        e.preventDefault();
        if (!editId) return;

        router.put(route("manajemen.update", editId), {
            role,
            username,
            password,
        }, {
            preserveScroll: true,
            onSuccess: () => setShowEditModal(false)
        });
    };

    // --- DELETE ---
    const openDeleteModal = (id: number) => {
        setDeleteId(id);
        setConfirmDelete(true);
    };

    const handleDelete = () => {
        if (!deleteId) return;

        router.delete(route("manajemen.destroy", deleteId), {
            preserveScroll: true,
            onSuccess: () => {
                setConfirmDelete(false);
                setDeleteId(null);
            }
        });
    };

    return (
        <AppLayout header="Manajemen Akun">
            <Head title="Manajemen Akun" />

            <div className={`${showModal || confirmDelete || showEditModal ? "blur-sm pointer-events-none" : ""}`}>

                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-2xl font-semibold">Manajemen Akun</h3>

                    <button
                        onClick={openModal}
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                    >
                        <span className="text-xl font-bold">+</span>
                        Tambah Akun
                    </button>
                </div>

                <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                    <div className="p-6 text-gray-900">
                        <h3 className="mb-4 text-lg font-medium">Daftar Pengguna</h3>

                        {/* ---------- TABLE CONTAINER: beri max-height dan overflow-y ---------- */}
                        <div className="rounded-lg border border-gray-200">
                            {/* Jika tabel sangat panjang, scroll di sini.
                                Sesuaikan max-h sesuai kebutuhan (contoh: 48vh). */}
                            <div className="max-h-[48vh] overflow-y-auto">
                                <table className="min-w-full table-auto text-left text-sm">
                                    <thead className="border-b">
                                        <tr>
                                            <th className="px-4 py-2 sticky top-0 bg-gray-100 z-10">No</th>
                                            <th className="px-4 py-2 sticky top-0 bg-gray-100 z-10">Username</th>
                                            <th className="px-4 py-2 sticky top-0 bg-gray-100 z-10">Role</th>
                                            <th className="px-4 py-2 sticky top-0 bg-gray-100 z-10">Dibuat</th>
                                            <th className="px-4 py-2 text-center sticky top-0 bg-gray-100 z-10">Aksi</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {users.length === 0 ? (
                                            <tr>
                                                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                                                    Belum ada pengguna.
                                                </td>
                                            </tr>
                                        ) : (
                                            users.map((u: any, index: number) => (
                                                <tr key={u.id} className="border-b hover:bg-gray-50">
                                                    <td className="px-4 py-2 align-middle">{index + 1}</td>
                                                    <td className="px-4 py-2 align-middle">{u.username}</td>
                                                    <td className="px-4 py-2 align-middle uppercase">{u.role}</td>
                                                    <td className="px-4 py-2 align-middle">
                                                        {new Date(u.created_at).toLocaleDateString('id-ID')}
                                                    </td>

                                                    <td className="px-4 py-2 text-center flex gap-2 justify-center">
                                                        {/* --- BUTTON EDIT --- */}
                                                        <button
                                                            onClick={() => openEditModal(u)}
                                                            className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                                                        >
                                                            Edit
                                                        </button>

                                                        {/* --- BUTTON DELETE --- */}
                                                        <button
                                                            onClick={() => openDeleteModal(u.id)}
                                                            className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                                                        >
                                                            Hapus
                                                        </button>

                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        {/* ---------- END TABLE CONTAINER ---------- */}

                    </div>
                </div>
            </div>

            {/* ===================== MODAL TAMBAH ===================== */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-[380px] p-6 animate-fadeIn">
                        <h2 className="text-lg font-semibold mb-4">Tambah Akun Baru</h2>

                        <form onSubmit={handleSave}>
                            <label className="block text-sm font-medium">Bagian</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="mt-1 w-full rounded-md border p-2"
                            >
                                <option value="">-- Pilih Bagian --</option>
                                <option value="bar">Bar</option>
                                <option value="kitchen">Kitchen</option>
                                <option value="supervisor">Supervisor</option>
                            </select>

                            <div className="mt-4">
                                <label className="block text-sm font-medium">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="mt-1 w-full rounded-md border p-2"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="mt-1 w-full rounded-md border p-2"
                                />
                            </div>

                            <div className="mt-6 flex justify-between">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 rounded-lg bg-gray-300 text-gray-800 hover:bg-gray-400"
                                >
                                    Kembali
                                </button>

                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
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
                    <div className="bg-white rounded-xl shadow-lg w-[380px] p-6 animate-fadeIn">
                        <h2 className="text-lg font-semibold mb-4">Edit Akun</h2>

                        <form onSubmit={handleUpdate}>
                            <label className="block text-sm font-medium">Bagian</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="mt-1 w-full rounded-md border p-2"
                            >
                                <option value="bar">Bar</option>
                                <option value="kitchen">Kitchen</option>
                                <option value="supervisor">Supervisor</option>
                            </select>

                            <div className="mt-4">
                                <label className="block text-sm font-medium">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="mt-1 w-full rounded-md border p-2"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium">Password</label>
                                <input
                                    type="text"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="mt-1 w-full rounded-md border p-2"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    *Ubah password yang lama
                                </p>
                            </div>

                            <div className="mt-6 flex justify-between">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 rounded-lg bg-gray-300 text-gray-800 hover:bg-gray-400"
                                >
                                    Kembali
                                </button>

                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
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
                    <div className="bg-white rounded-2xl px-6 py-5 w-[360px] text-center shadow-lg animate-fadeIn">

                        <p className="text-base font-medium mb-6">
                            Anda yakin ingin menghapus user ini?
                        </p>

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setConfirmDelete(false)}
                                className="px-6 py-2 rounded-xl bg-gray-300 text-gray-800 hover:bg-gray-400"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleDelete}
                                className="px-6 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
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
