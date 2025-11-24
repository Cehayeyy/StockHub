import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Manajemen() {
    const { users, csrf_token, errors }: any = usePage().props;

    const [showModal, setShowModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const [role, setRole] = useState("");
    const [nomor, setNomor] = useState("");
    const [password, setPassword] = useState("");

    const openModal = () => {
        setRole("");
        setNomor("");
        setPassword("");
        setShowModal(true);
    };

    const handleSave = (e: any) => {
        e?.preventDefault?.();
        router.post(route('users.store'), {
            role,
            nomor,
            password,
        }, {
            preserveScroll: true,
            onSuccess: () => setShowModal(false)
        });
    };

    // === HANDLE CONFIRM DELETE ===
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

            {/* BACKGROUND BLUR KETIKA ADA MODAL */}
            <div className={`${showModal || confirmDelete ? "blur-sm pointer-events-none" : ""}`}>

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

                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-full text-left text-sm">
                                <thead className="border-b bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-2">No</th>
                                        <th className="px-4 py-2">Username</th>
                                        <th className="px-4 py-2">Role</th>
                                        <th className="px-4 py-2">Dibuat</th>
                                        <th className="px-4 py-2 text-center">Aksi</th>
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
                                                <td className="px-4 py-2">{index + 1}</td>
                                                <td className="px-4 py-2">{u.username}</td>
                                                <td className="px-4 py-2 uppercase">{u.role}</td>
                                                <td className="px-4 py-2">
                                                    {new Date(u.created_at).toLocaleDateString('id-ID')}
                                                </td>

                                                <td className="px-4 py-2 text-center">
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
                </div>
            </div>


            {/* ========================= */}
            {/* MODAL TAMBAH AKUN */}
            {/* ========================= */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-[380px] p-6 animate-fadeIn">

                        <h2 className="text-lg font-semibold mb-4">Tambah Akun Baru</h2>

                        <form onSubmit={handleSave}>

                            {/* ROLE */}
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

                            {/* NOMOR */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium">Nomor Username</label>
                                <input
                                    type="number"
                                    value={nomor}
                                    onChange={(e) => setNomor(e.target.value)}
                                    className="mt-1 w-full rounded-md border p-2"
                                />
                                {errors?.nomor && (
                                    <p className="text-red-500 text-xs mt-1">{errors.nomor}</p>
                                )}
                            </div>

                            {/* PASSWORD */}
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


            {/* ========================= */}
            {/* MODAL KONFIRMASI HAPUS */}
            {/* ========================= */}
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
