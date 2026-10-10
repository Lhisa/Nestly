import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router';

export function UnsavedChangesGuard({ dirty, completed }: { dirty: boolean; completed: RefObject<boolean> }) {
  const blocker = useBlocker(() => dirty && !completed.current);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useBeforeUnload((event) => { if (dirty && !completed.current) { event.preventDefault(); event.returnValue = ''; } });
  useEffect(() => {
    if (blocker.state === 'blocked') {
      returnFocus.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
    } else if (dialog.current?.open) {
      dialog.current.close();
      returnFocus.current?.focus();
    }
  }, [blocker.state]);
  return <dialog ref={dialog} aria-labelledby="discard-title" aria-describedby="discard-description" onCancel={(event) => {
    event.preventDefault(); if (blocker.state === 'blocked') blocker.reset();
  }}><h2 id="discard-title">Vols abandonar el formulari?</h2><p id="discard-description">Hi ha canvis sense guardar. Si els descartes, els hauràs de tornar a introduir.</p>
    <div className="form-actions"><button type="button" autoFocus onClick={() => { if (blocker.state === 'blocked') blocker.reset(); }}>Continuar editant</button>
    <button type="button" className="primary" onClick={() => { if (blocker.state === 'blocked') blocker.proceed(); }}>Descartar canvis</button></div>
  </dialog>;
}
