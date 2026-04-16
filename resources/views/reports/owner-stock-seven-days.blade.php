<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Report Stok 7 Hari</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            color: #1f2937;
            font-size: 11px;
        }

        .header {
            margin-bottom: 12px;
        }

        .title {
            font-size: 18px;
            font-weight: 700;
            margin: 0;
            color: #111827;
        }

        .meta {
            margin-top: 4px;
            color: #4b5563;
            font-size: 10px;
        }

        .section-title {
            margin: 16px 0 8px;
            font-size: 13px;
            font-weight: 700;
            color: #111827;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        th, td {
            border: 1px solid #d1d5db;
            padding: 6px;
            vertical-align: top;
            word-wrap: break-word;
        }

        th {
            background: #f3f4f6;
            font-weight: 700;
            text-align: left;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .muted {
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="header">
        <p class="title">Report Stok 7 Hari Terakhir</p>
        <p class="meta">
            Periode: {{ $startDate->format('d-m-Y') }} s/d {{ $endDate->format('d-m-Y') }}
            | Digenerate: {{ $generatedAt->format('d-m-Y H:i:s') }}
        </p>
    </div>

    <p class="section-title">1) Data Stok Harian (Bar + Dapur)</p>
    <table style="margin-bottom: 10px;">
        <thead>
            <tr>
                <th style="width: 30%;">Tanggal</th>
                <th style="width: 20%;" class="text-right">Jumlah Baris Data</th>
                <th style="width: 20%;" class="text-right">Jumlah Staff</th>
                <th style="width: 30%;">Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($dailySummary as $summary)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($summary['tanggal'])->format('d-m-Y') }}</td>
                    <td class="text-right">{{ number_format($summary['jumlah_baris'], 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format($summary['jumlah_staff'], 0, ',', '.') }}</td>
                    <td>{{ $summary['status'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table>
        <thead>
            <tr>
                <th style="width: 9%;">Tanggal</th>
                <th style="width: 8%;">Divisi</th>
                <th style="width: 8%;">Jenis</th>
                <th style="width: 21%;">Nama Stok</th>
                <th style="width: 6%;">Unit</th>
                <th style="width: 8%;" class="text-right">Stok Awal</th>
                <th style="width: 8%;" class="text-right">Stok Masuk</th>
                <th style="width: 8%;" class="text-right">Pemakaian</th>
                <th style="width: 8%;" class="text-right">Stok Tersisa</th>
                <th style="width: 16%;">Staff Input</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($reportRows as $row)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($row->tanggal)->format('d-m-Y') }}</td>
                    <td>{{ $row->divisi }}</td>
                    <td>{{ $row->jenis }}</td>
                    <td>
                        {{ $row->nama_stok }}
                        @if (!empty($row->is_placeholder))
                            <span class="muted"> (data kosong)</span>
                        @endif
                    </td>
                    <td>{{ $row->unit ?? '-' }}</td>
                    <td class="text-right">{{ number_format((float) ($row->stok_awal ?? 0), 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format((float) ($row->stok_masuk ?? 0), 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format((float) ($row->stok_pemakaian ?? 0), 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format((float) ($row->stok_tersisa ?? 0), 0, ',', '.') }}</td>
                    <td>{{ $row->staff_input ?? '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="10" class="text-center muted">Tidak ada data stok pada periode ini.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <p class="section-title">2) Ringkasan Staff Penginput (7 Hari)</p>
    <table>
        <thead>
            <tr>
                <th style="width: 70%;">Nama Staff</th>
                <th style="width: 30%;" class="text-right">Jumlah Input</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($staffInputSummary as $staff)
                <tr>
                    <td>{{ $staff['staff'] }}</td>
                    <td class="text-right">{{ number_format($staff['jumlah_input'], 0, ',', '.') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="2" class="text-center muted">Belum ada data staff penginput pada periode ini.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <p class="section-title">3) Data Stok Opname Hari Senin (Jika Ada)</p>
    <table>
        <thead>
            <tr>
                <th style="width: 20%;">Waktu</th>
                <th style="width: 12%;">Divisi</th>
                <th style="width: 20%;">Staff</th>
                <th style="width: 48%;">Keterangan</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($mondayOpnameLogs as $log)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($log['waktu'])->format('d-m-Y H:i') }}</td>
                    <td>{{ $log['divisi'] }}</td>
                    <td>{{ $log['staff'] }}</td>
                    <td>{{ $log['keterangan'] }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="4" class="text-center muted">Tidak ada input stok opname hari Senin pada periode ini.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
