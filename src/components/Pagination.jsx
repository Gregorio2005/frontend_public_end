import React from 'react';

const Pagination = ({ currentPage, totalPages, total, onPageChange }) => {
    if (totalPages <= 1) return null;

    const getPages = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);

            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            if (currentPage <= 3) {
                start = 2;
                end = Math.min(maxVisible, totalPages - 1);
            } else if (currentPage >= totalPages - 2) {
                start = Math.max(2, totalPages - maxVisible + 1);
                end = totalPages - 1;
            }

            if (start > 2) pages.push('...');
            for (let i = start; i <= end; i++) pages.push(i);
            if (end < totalPages - 1) pages.push('...');

            pages.push(totalPages);
        }

        return pages;
    };

    const styles = {
        container: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 0',
            flexWrap: 'wrap',
            gap: '0.5rem',
        },
        info: {
            fontSize: '0.85rem',
            color: '#64748b',
        },
        buttons: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
        },
        btn: (active = false, disabled = false) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '36px',
            height: '36px',
            padding: '0 0.5rem',
            border: active ? '1.5px solid #d32f2f' : '1px solid #e2e8f0',
            borderRadius: '8px',
            background: active ? '#d32f2f' : disabled ? '#f1f5f9' : '#ffffff',
            color: active ? '#ffffff' : disabled ? '#cbd5e1' : '#475569',
            fontSize: '0.85rem',
            fontWeight: active ? '700' : '500',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            userSelect: 'none',
        }),
        dots: {
            minWidth: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: '0.85rem',
        },
    };

    const pages = getPages();

    return (
        <div style={styles.container}>
            <span style={styles.info}>
                {total} registro{total !== 1 ? 's' : ''} — Página {currentPage} de {totalPages}
            </span>
            <div style={styles.buttons}>
                <button
                    style={styles.btn(false, currentPage === 1)}
                    onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Anterior"
                >
                    ‹
                </button>

                {pages.map((page, idx) =>
                    page === '...' ? (
                        <span key={`dots-${idx}`} style={styles.dots}>…</span>
                    ) : (
                        <button
                            key={page}
                            style={styles.btn(page === currentPage)}
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </button>
                    )
                )}

                <button
                    style={styles.btn(false, currentPage === totalPages)}
                    onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    title="Siguiente"
                >
                    ›
                </button>
            </div>
        </div>
    );
};

export default Pagination;
