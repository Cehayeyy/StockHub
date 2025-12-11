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

    const [role, setRole] = useState('');
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');

    // Helper: hitung username berikutnya berdasarkan role & data users
    const getNextUsername = (roleValue: string) => {
        if (!roleValue) return '';

        const prefix = roleValue.toLowerCase(); // bar, kitchen, supervisor

        const sameRoleUsers = (users || []).filter(
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

            <div
                className={`${
                    showModal || confirmDelete || showEditModal
                        ? 'blur-sm pointer-events-none'
                        : ''
                }`}
            >
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-2xl font-semibold">Manajemen Akun</h3>

                    <button
                        onClick={openModal}
                        className="flex items-center gap-2 rounded-lg bg-[#D9A978] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D9A978]"
                    >
                        <span className="text-xl font-bold">+</span>
                        Tambah Akun
                    </button>
                </div>

                <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                    <div className="p-6 text-gray-900">
                        <h3 className="mb-4 text-lg font-medium">
                            Daftar Pengguna
                        </h3>

                        {/* TABLE dengan scroll di dalam */}
                        <div className="rounded-lg border border-gray-200">
                            <div className="max-h-[48vh] overflow-y-auto">
                                <table className="min-w-full table-auto text-left text-sm">
                                    <thead className="border-b">
                                        <tr>
                                            <th className="px-4 py-2 sticky top-0 bg-gray-100 z-10">
                                                No
                                            </th>
                                            <th className="px-4 py-2 sticky top-0 bg-gray-100 z-10">
                                                Username
                                            </th>
                                            <th className="px-4 py-2 sticky top-0 bg-gray-100 z-10">
                                                Role
                                            </th>
                                            <th className="px-4 py-2 sticky top-0 bg-gray-100 z-10">
                                                Dibuat
                                            </th>
                                            <th className="px-4 py-2 text-center sticky top-0 bg-gray-100 z-10">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {users.length === 0 ? (
                                            <tr>
                                                <td
                                                    className="px-4 py-6 text-center text-gray-500"
                                                    colSpan={5}
                                                >
                                                    Belum ada pengguna.
                                                </td>
                                            </tr>
                                        ) : (
                                            users.map(
                                                (
                                                    u: any,
                                                    index: number
                                                ) => (
                                                    <tr
                                                        key={u.id}
                                                        className="border-b hover:bg-gray-50"
                                                    >
                                                        <td className="px-4 py-2 align-middle">
                                                            {index + 1}
                                                        </td>

                                                        {/* TAMPILAN: Nama (usernameIncrement) */}
                                                        <td className="px-4 py-2 align-middle">
                                                            {u.name || '-'}
                                                            {u.username
                                                                ? ` (${u.username})`
                                                                : ''}
                                                        </td>

                                                        <td className="px-4 py-2 align-middle uppercase">
                                                            {u.role}
                                                        </td>
                                                        <td className="px-4 py-2 align-middle">
                                                            {new Date(
                                                                u.created_at
                                                            ).toLocaleDateString(
                                                                'id-ID'
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-2 text-center flex gap-2 justify-center">
                                                            <button
                                                                onClick={() =>
                                                                    openEditModal(
                                                                        u
                                                                    )
                                                                }
                                                                className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                                                            >
                                                                Edit
                                                            </button>

                                                            <button
                                                                onClick={() =>
                                                                    openDeleteModal(
                                                                        u.id
                                                                    )
                                                                }
                                                                className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                                                            >
                                                                Hapus
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===================== MODAL TAMBAH ===================== */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    <div className="bg-white rounded-xl shadow-lg w-[380px] p-6 animate-fadeIn">
                        <h2 className="text-lg font-semibold mb-4">
                            Tambah Akun Baru
                        </h2>

                        <form onSubmit={handleSave}>
                            <label className="block text-sm font-medium">
                                Bagian
                            </label>
                            <select
                                value={role}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setRole(value);
                                    setUsername(
                                        value ? getNextUsername(value) : ''
                                    );
                                }}
                                className="mt-1 w-full rounded-md border p-2"
                                required
                            >
                                <option value="">
                                    -- Pilih Bagian --
                                </option>
                                <option value="bar">Bar</option>
                                <option value="kitchen">Kitchen</option>
                                <option value="supervisor">Supervisor</option>
                            </select>

                            {/* Username otomatis (bar1, kitchen2, dst) */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium">
                                    Kode Username (otomatis)
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    readOnly
                                    className="mt-1 w-full rounded-md border p-2 bg-gray-100 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Otomatis: contoh <strong>bar1</strong>,
                                    <strong> bar2</strong>,{' '}
                                    <strong>kitchen1</strong>, dst sesuai
                                    bagian.
                                </p>
                            </div>

                            {/* Nama nyata user */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium">
                                    Nama
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) =>
                                        setName(e.target.value)
                                    }
                                    className="mt-1 w-full rounded-md border p-2"
                                    required
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    className="mt-1 w-full rounded-md border p-2"
                                    required
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
                        <h2 className="text-lg font-semibold mb-4">
                            Edit Akun
                        </h2>

                        <form onSubmit={handleUpdate}>
                            <label className="block text-sm font-medium">
                                Bagian
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="mt-1 w-full rounded-md border p-2"
                                required
                            >
                                <option value="bar">Bar</option>
                                <option value="kitchen">Kitchen</option>
                                <option value="supervisor">
                                    Supervisor
                                </option>
                            </select>

                            <div className="mt-4">
                                <label className="block text-sm font-medium">
                                    Kode Username
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) =>
                                        setUsername(e.target.value)
                                    }
                                    className="mt-1 w-full rounded-md border p-2"
                                    required
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium">
                                    Nama
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) =>
                                        setName(e.target.value)
                                    }
                                    className="mt-1 w-full rounded-md border p-2"
                                    required
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    className="mt-1 w-full rounded-md border p-2"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Kosongkan jika tidak ingin mengubah
                                    password.
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
