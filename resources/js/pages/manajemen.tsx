import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, User, Calendar, Edit, Trash2, Settings } from 'lucide-react';

export default function Manajemen() {
    // Pastikan users memiliki struktur paginasi atau array biasa
    const { users, csrf_token, errors, allowedRoles, auth }: any = usePage().props;

    // Normalisasi data user (apakah paginate atau collection biasa)
    const userList = users.data || users;
    const links = users.links || []; // Ambil link pagination jika ada

    // Role user yang sedang login
    const currentUserRole = auth?.user?.role;

    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSelfUpdateModal, setShowSelfUpdateModal] = useState(false);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const [editId, setEditId] = useState<number | null>(null);

    const [role, setRole] = useState('');
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');

    // State untuk self update (owner)
    const [selfUsername, setSelfUsername] = useState('');
    const [selfPassword, setSelfPassword] = useState('');

    // State untuk validasi error frontend
    const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

    // Helper: hitung username berikutnya berdasarkan role & data users
    const getNextUsername = (roleValue: string) => {
        if (!roleValue) return '';

        const prefix = roleValue.toLowerCase(); // bar, dapur, supervisor, owner

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
        setValidationErrors({});
        setShowModal(true);
    };

    // --- OPEN SELF UPDATE MODAL (OWNER) ---
    const openSelfUpdateModal = () => {
        setSelfUsername(auth?.user?.username || '');
        setSelfPassword('');
        setValidationErrors({});
        setShowSelfUpdateModal(true);
    };

    // --- HANDLE SELF UPDATE (OWNER) ---
    const handleSelfUpdate = (e: any) => {
        e.preventDefault();

        // Validasi frontend
        const errs: {[key: string]: string} = {};
        if (selfUsername.length < 5) {
            errs.selfUsername = 'Username tidak boleh kurang dari 5 karakter.';
        }
        if (selfPassword && selfPassword.length < 5) {
            errs.selfPassword = 'Password tidak boleh kurang dari 5 karakter.';
        }

        if (Object.keys(errs).length > 0) {
            setValidationErrors(errs);
            return;
        }

        setValidationErrors({});

        router.put(
            route('manajemen.updateSelf'),
            {
                username: selfUsername,
                password: selfPassword,
            },
            {
                preserveScroll: true,
                onSuccess: () => setShowSelfUpdateModal(false),
                onError: (errors) => setValidationErrors(errors),
            }
        );
    };

    // --- SAVE / STORE ---
    const handleSave = (e: any) => {
        e.preventDefault();

        // Validasi frontend
        const errs: {[key: string]: string} = {};

        if (!role) {
            errs.role = 'Bagian harus dipilih.';
        }
        if (!name || name.trim().length < 3) {
            errs.name = 'Username harus diisi minimal 3 karakter.';
        }
        if (!password || password.length < 5) {
            errs.password = 'Password tidak boleh kurang dari 5 karakter.';
        }

        if (Object.keys(errs).length > 0) {
            setValidationErrors(errs);
            return;
        }

        setValidationErrors({});

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
                onError: (errors) => setValidationErrors(errors),
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
        setValidationErrors({});
        setShowEditModal(true);
    };

    // --- UPDATE USER ---
    const handleUpdate = (e: any) => {
        e.preventDefault();
        if (!editId) return;

        // Validasi frontend
        const errs: {[key: string]: string} = {};
        if (username.length < 5) {
            errs.username = 'Username tidak boleh kurang dari 5 karakter.';
        }
        if (password && password.length < 5) {
            errs.password = 'Password tidak boleh kurang dari 5 karakter.';
        }

        if (Object.keys(errs).length > 0) {
            setValidationErrors(errs);
            return;
        }

        setValidationErrors({});

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
                onError: (errors) => setValidationErrors(errors),
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

    // Helper badge role
    const getRoleBadgeClass = (role: string) => {
        switch (role.toLowerCase()) {
            case 'bar': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'dapur': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'supervisor': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'owner': return 'bg-green-50 text-green-700 border-green-100';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Helper: cek apakah user bisa diedit/dihapus oleh current user
    const canManageUser = (user: any) => {
        // Owner tidak bisa mengedit/hapus diri sendiri
        if (currentUserRole === 'owner' && user.id === auth?.user?.id) {
            return false;
        }

        if (currentUserRole === 'owner') return true;
        if (currentUserRole === 'supervisor') {
            // Supervisor tidak bisa mengelola owner atau supervisor lain
            return !['owner', 'supervisor'].includes(user.role.toLowerCase());
        }
        return false;
    };

    return (
        <AppLayout header="Manajemen Akun">
            <Head title="Manajemen Akun" />

            <div className="py-6">
                <div className={`bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[600px] flex flex-col ${
                        showModal || confirmDelete || showEditModal || showSelfUpdateModal ? 'blur-sm pointer-events-none' : ''
                    }`}
                >
                    {/* --- HEADER --- */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h3 className="text-lg font-bold text-gray-800">Daftar Pengguna</h3>

                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            {/* Button Update Akun Owner */}
                            {currentUserRole === 'owner' && (
                                <button
                                    onClick={openSelfUpdateModal}
                                    className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-full text-sm font-bold shadow-md hover:bg-green-700 transition w-full sm:w-auto justify-center"
                                >
                                    <Settings className="w-4 h-4" />
                                    Update Akun Saya
                                </button>
                            )}

                            <button
                                onClick={openModal}
                                className="flex items-center gap-2 bg-[#D9A978] text-white px-5 py-2 rounded-full text-sm font-bold shadow-md hover:bg-[#c4925e] transition w-full sm:w-auto justify-center"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah Akun
                            </button>
                        </div>
                    </div>

                    {/* --- MOBILE VIEW (CARDS) --- */}
                    {/* Tampil di layar kecil (< md) */}
                    <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
                        {userList.length === 0 ? (
                             <div className="text-center text-gray-400 py-8 border rounded-xl bg-gray-50">
                                Belum ada pengguna.
                            </div>
                        ) : (
                            userList.map((u: any) => (
                                <div key={u.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="font-bold text-gray-800">{u.username || '-'}</div>
                                            <div className="text-sm text-gray-500">{u.name || '-'}</div>
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeClass(u.role)} uppercase tracking-wide`}>
                                            {u.role}
                                        </span>
                                    </div>

                                    <div className="flex items-center text-xs text-gray-400 mb-4 gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Dibuat: {new Date(u.created_at).toLocaleDateString('id-ID')}
                                    </div>

                                    <div className="flex gap-2 border-t pt-3">
                                        {canManageUser(u) && (
                                            <>
                                                <button
                                                    onClick={() => openEditModal(u)}
                                                    className="flex-1 flex items-center justify-center gap-1 bg-[#1D8CFF] text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[#166ac4] transition"
                                                >
                                                    <Edit className="w-3 h-3" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(u.id)}
                                                    className="flex-1 flex items-center justify-center gap-1 bg-[#FF4B4B] text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[#e03535] transition"
                                                >
                                                    <Trash2 className="w-3 h-3" /> Hapus
                                                </button>
                                            </>
                                        )}
                                        {!canManageUser(u) && (
                                            <span className="flex-1 text-center text-xs text-gray-400 py-2">Tidak dapat dikelola</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* --- DESKTOP VIEW (TABLE) --- */}
                    {/* Tampil di layar sedang ke atas (md:block) */}
                    <div className="hidden md:block w-full rounded-xl border border-gray-100 bg-white overflow-hidden flex-1 mb-6">
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 w-16 text-center">No</th>
                                        <th className="px-6 py-4">Username</th>
                                        <th className="px-6 py-4">Kode Username</th>
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
                                                    {users.current_page
                                                        ? (users.current_page - 1) * users.per_page + index + 1
                                                        : index + 1}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-800">
                                                    {u.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {u.username || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeClass(u.role)} uppercase tracking-wide`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-gray-500">
                                                    {new Date(u.created_at).toLocaleDateString('id-ID')}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {canManageUser(u) ? (
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
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* --- PAGINATION (Responsive) --- */}
                    {links.length > 3 && (
                        <div className="mt-auto flex justify-center md:justify-end pt-4">
                            <div className="flex flex-wrap justify-center gap-1 bg-gray-50 p-1 rounded-full border border-gray-200">
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
                                                relative inline-flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all rounded-full
                                                ${
                                                    link.active
                                                        ? 'bg-[#D9A978] text-white shadow-md'
                                                        : 'text-gray-600 hover:bg-white hover:text-[#D9A978]'
                                                }
                                                ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}
                                            `}
                                            dangerouslySetInnerHTML={{ __html: label }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* ===================== MODAL TAMBAH ===================== */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 sm:p-8 animate-fadeIn">
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
                                    className={`w-full bg-gray-50 rounded-xl px-4 py-2 border focus:ring-2 focus:ring-[#D9A978] outline-none ${validationErrors.role ? 'border-red-500' : 'border-gray-200'}`}
                                    required
                                >
                                    <option value="">-- Pilih Bagian --</option>
                                    {allowedRoles?.includes('owner') && <option value="owner">Owner</option>}
                                    {allowedRoles?.includes('supervisor') && <option value="supervisor">Supervisor</option>}
                                    {allowedRoles?.includes('bar') && <option value="bar">Bar</option>}
                                    {allowedRoles?.includes('dapur') && <option value="dapur">Dapur</option>}
                                </select>
                                {validationErrors.role && (
                                    <p className="text-red-500 text-xs mt-1">{validationErrors.role}</p>
                                )}
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
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={`w-full bg-gray-50 rounded-xl px-4 py-2 border focus:ring-2 focus:ring-[#D9A978] outline-none ${validationErrors.name ? 'border-red-500' : 'border-gray-200'}`}
                                    required
                                />
                                {validationErrors.name && (
                                    <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full bg-gray-50 rounded-xl px-4 py-2 border focus:ring-2 focus:ring-[#D9A978] outline-none ${validationErrors.password ? 'border-red-500' : 'border-gray-200'}`}
                                    required
                                />
                                {validationErrors.password && (
                                    <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
                                )}
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
                                    type="button"
                                    onClick={handleSave}
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
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 sm:p-8 animate-fadeIn">
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
                                    {allowedRoles?.includes('bar') && <option value="bar">Bar</option>}
                                    {allowedRoles?.includes('dapur') && <option value="dapur">Dapur</option>}
                                    {allowedRoles?.includes('supervisor') && <option value="supervisor">Supervisor</option>}
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
                                    className={`w-full bg-transparent font-mono text-lg font-bold text-gray-800 outline-none ${validationErrors.username ? 'text-red-500' : ''}`}
                                    required
                                />
                                {validationErrors.username && (
                                    <p className="text-red-500 text-xs mt-1">{validationErrors.username}</p>
                                )}
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
                                    className={`w-full bg-gray-50 rounded-xl px-4 py-2 border focus:ring-2 focus:ring-[#D9A978] outline-none ${validationErrors.password ? 'border-red-500' : 'border-gray-200'}`}
                                    placeholder="Isi jika ingin mengubah"
                                />
                                {validationErrors.password && (
                                    <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
                                )}
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
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8 text-center animate-fadeIn">
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

            {/* ===================== MODAL SELF UPDATE (OWNER) ===================== */}
            {showSelfUpdateModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 sm:p-8 animate-fadeIn">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <Settings className="w-8 h-8 text-green-600" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-center mb-2 text-gray-800">
                            Update Akun Owner
                        </h2>
                        <p className="text-center text-gray-500 text-sm mb-6">
                            Ubah username dan password akun Anda
                        </p>

                        <form onSubmit={handleSelfUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Username Baru
                                </label>
                                <input
                                    type="text"
                                    value={selfUsername}
                                    onChange={(e) => setSelfUsername(e.target.value)}
                                    className={`w-full bg-gray-50 rounded-xl px-4 py-2 border focus:ring-2 focus:ring-green-500 outline-none ${validationErrors.selfUsername || validationErrors.username ? 'border-red-500' : 'border-gray-200'}`}
                                    required
                                />
                                {(validationErrors.selfUsername || validationErrors.username) && (
                                    <p className="text-red-500 text-xs mt-1">{validationErrors.selfUsername || validationErrors.username}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Password Baru (Opsional)
                                </label>
                                <input
                                    type="password"
                                    value={selfPassword}
                                    onChange={(e) => setSelfPassword(e.target.value)}
                                    className={`w-full bg-gray-50 rounded-xl px-4 py-2 border focus:ring-2 focus:ring-green-500 outline-none ${validationErrors.selfPassword || validationErrors.password ? 'border-red-500' : 'border-gray-200'}`}
                                    placeholder="Kosongkan jika tidak ingin mengubah"
                                />
                                {(validationErrors.selfPassword || validationErrors.password) && (
                                    <p className="text-red-500 text-xs mt-1">{validationErrors.selfPassword || validationErrors.password}</p>
                                )}
                            </div>

                            <div className="pt-4 flex justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowSelfUpdateModal(false)}
                                    className="flex-1 px-4 py-2 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition"
                                >
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
