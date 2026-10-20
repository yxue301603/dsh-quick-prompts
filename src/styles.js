export default `
.dqp-launch,.dqp-pin-chip{font:inherit;display:inline-flex;align-items:center;gap:5px;cursor:pointer;border-radius:7px;white-space:nowrap}
.dqp-launch{border:0;background:transparent;padding:5px 7px;color:var(--dsw-alias-label-secondary,#64748b);font-size:12px;line-height:20px}
.dqp-launch:hover{background:var(--dsw-alias-bg-layer-2,#f1f5f9);color:var(--dsw-alias-label-primary,#1e293b)}
.dqp-pins-seat{box-sizing:border-box;display:flex;justify-content:center;flex:none;min-width:0;padding:0 var(--dsh-composer-side-clearance,16px)}
.dqp-pins{box-sizing:border-box;width:100%;max-width:var(--dsh-composer-card-max-width,100%);min-width:0;display:flex;gap:6px;flex-wrap:wrap;padding:0 0 8px}
.dqp-pin-chip{border:1px solid var(--dsw-alias-border-l1,#e2e8f0);background:transparent;color:var(--dsw-alias-label-secondary,#64748b);padding:4px 9px;font-size:11px;line-height:17px;max-width:170px;overflow:hidden;text-overflow:ellipsis;display:block}
.dqp-pin-chip:hover{border-color:var(--dsw-alias-brand-primary,#0f766e);color:var(--dsw-alias-brand-primary,#0f766e)}
.dqp-dialog{--qp-bg:var(--dsw-alias-bg-layer-1,#fff);--qp-text:var(--dsw-alias-label-primary,#1e293b);--qp-muted:var(--dsw-alias-label-secondary,#64748b);--qp-line:var(--dsw-alias-border-l1,#e2e8f0);--qp-soft:var(--dsw-alias-bg-layer-2,#f5f7f8);--qp-accent:var(--dsw-alias-brand-primary,#0f766e);font:13px/1.5 system-ui,sans-serif;color:var(--qp-text);background:var(--qp-bg);border:1px solid var(--qp-line);border-radius:16px;padding:0;width:min(620px,calc(100vw - 32px));max-width:none;max-height:min(680px,calc(100dvh - 40px));overflow:hidden;box-shadow:0 24px 90px #0003}
.dqp-dialog::backdrop{background:#0b122333}
.dqp-dialog *{box-sizing:border-box}
.dqp-shell{display:flex;flex-direction:column;max-height:min(678px,calc(100dvh - 42px))}
.dqp-heading{display:flex;align-items:center;gap:10px;padding:19px 22px 15px}
.dqp-mark{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:var(--qp-soft);color:var(--qp-accent);flex-shrink:0}
.dqp-heading h2{font-size:16px;line-height:1.4;margin:0;font-weight:650;letter-spacing:.2px}
.dqp-subtitle{font-size:11px;color:var(--qp-muted);margin-top:2px}
.dqp-spacer{flex:1}
.dqp-dialog button{font:inherit;cursor:pointer}
.dqp-dialog button:disabled{opacity:.45;cursor:default}
.dqp-icon,.dqp-text-button{display:inline-flex;align-items:center;justify-content:center;border:0;background:transparent;color:var(--qp-muted);border-radius:6px;padding:6px;gap:4px}
.dqp-icon:hover,.dqp-text-button:hover{background:var(--qp-soft);color:var(--qp-text)}
.dqp-icon.is-pinned{color:var(--qp-accent)}
.dqp-search-row{padding:0 22px 12px;display:flex;gap:8px}
.dqp-search-wrap{position:relative;flex:1;min-width:0}
.dqp-search-icon{position:absolute;left:11px;top:11px;color:var(--qp-muted);pointer-events:none}
.dqp-input,.dqp-select,.dqp-textarea{font:inherit;color:var(--qp-text);background:var(--qp-bg);border:1px solid var(--qp-line);border-radius:8px;width:100%;padding:9px 11px;outline:none;min-width:0}
.dqp-input[type=search]{padding-left:34px}
.dqp-input:focus,.dqp-select:focus,.dqp-textarea:focus{border-color:var(--qp-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--qp-accent) 12%,transparent)}
.dqp-input::placeholder,.dqp-textarea::placeholder{color:var(--qp-muted);opacity:.8}
.dqp-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;border:1px solid var(--qp-line);border-radius:8px;background:var(--qp-bg);color:var(--qp-text);padding:8px 12px;white-space:nowrap}
.dqp-btn:hover{background:var(--qp-soft)}
.dqp-primary{border-color:var(--dsw-alias-button-primary-fill,#0f766e);background:var(--dsw-alias-button-primary-fill,#0f766e);color:var(--dsw-alias-label-primary-foreground,#fff)}
.dqp-primary:hover:not(:disabled){border-color:var(--dsw-alias-button-primary-hover,#0d665e);background:var(--dsw-alias-button-primary-hover,#0d665e)}
.dqp-filters{display:flex;align-items:center;gap:5px;padding:0 22px 12px;border-bottom:1px solid var(--qp-line);flex-wrap:wrap}
.dqp-filter{border:0;background:transparent;color:var(--qp-muted);padding:5px 9px;border-radius:6px;font-size:12px!important}
.dqp-filter[aria-pressed=true]{background:var(--qp-soft);color:var(--qp-text);font-weight:600}
.dqp-category-filter{width:auto;max-width:145px;padding:4px 8px;font-size:11px;margin-left:auto;background:transparent}
.dqp-list{overflow-y:auto;padding:7px 10px;min-height:175px;max-height:360px;overscroll-behavior:contain}
.dqp-row{display:flex;align-items:center;gap:4px;border-radius:10px;padding:3px 8px;margin:2px 0;border:1px solid transparent}
.dqp-row:hover,.dqp-row.is-active{background:var(--qp-soft);border-color:var(--qp-line)}
.dqp-prompt{flex:1;min-width:0;text-align:left;border:0;background:transparent;color:var(--qp-text);padding:9px 4px;display:block}
.dqp-prompt-title{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:550}
.dqp-badge{font-size:10px;font-weight:400;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:1px 5px;border-radius:4px;background:var(--qp-bg);color:var(--qp-muted);border:1px solid var(--qp-line)}
.dqp-excerpt{font-size:11px;color:var(--qp-muted);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;margin-top:3px;line-height:1.7}
.dqp-row-actions{display:flex;flex-shrink:0;gap:1px}
.dqp-row-actions .dqp-icon{padding:5px}
.dqp-foot{display:flex;align-items:center;gap:8px;min-height:44px;padding:10px 22px;border-top:1px solid var(--qp-line);font-size:11px;color:var(--qp-muted)}
.dqp-foot kbd{font:10px/1.3 system-ui;border:1px solid var(--qp-line);border-radius:4px;padding:1px 4px;margin-right:3px;background:var(--qp-soft)}
.dqp-empty{padding:42px 15px;text-align:center;color:var(--qp-muted)}
.dqp-empty strong{display:block;color:var(--qp-text);font-size:14px;margin-bottom:7px}
.dqp-content{overflow-y:auto;padding:0 22px 20px;min-height:0;overscroll-behavior:contain}
.dqp-field{display:block;margin-bottom:14px}
.dqp-label{display:block;font-size:12px;font-weight:550;margin-bottom:6px}
.dqp-textarea{resize:vertical;min-height:140px;line-height:1.7}
.dqp-columns{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.dqp-check{display:flex;align-items:center;gap:8px;margin:12px 0;font-size:12px}
.dqp-check input{accent-color:var(--qp-accent)}
.dqp-hint{font-size:11px;color:var(--qp-muted);line-height:1.7;overflow-wrap:anywhere}
.dqp-preview{background:var(--qp-soft);padding:12px;border-radius:9px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:180px;overflow:auto;font:12px/1.7 system-ui,sans-serif;border:1px solid var(--qp-line)}
.dqp-notice{margin:0 22px 12px;border:1px solid var(--qp-line);background:var(--qp-soft);padding:9px 11px;border-radius:8px;font-size:12px;overflow-wrap:anywhere}
.dqp-error{border-color:#e3a6a6;color:var(--dsw-alias-state-error-primary,#b42318)}
.dqp-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}
.dqp-actions-left{justify-content:flex-start}
.dqp-danger{color:var(--dsw-alias-state-error-primary,#b42318)}
.dqp-divider{border:0;border-top:1px solid var(--qp-line);margin:20px 0}
.dqp-import-list{margin:12px 0;padding:0;list-style:none;max-height:160px;overflow:auto}
.dqp-import-list li{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--qp-line)}
.dqp-launch:focus-visible,.dqp-pin-chip:focus-visible,.dqp-dialog button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#0f766e);outline-offset:2px}
@media(max-width:480px){.dqp-heading{padding:16px}.dqp-search-row,.dqp-filters{padding-left:16px;padding-right:16px}.dqp-content{padding:0 16px 16px}.dqp-foot{padding:10px 16px}.dqp-row-actions{gap:0}.dqp-columns{grid-template-columns:1fr}.dqp-subtitle{font-size:10px}.dqp-foot .dqp-key-hint{display:none}.dqp-category-filter{max-width:105px}.dqp-search-row .dqp-btn{padding:8px}.dqp-pins{gap:4px}}
`;
