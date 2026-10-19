'use client';

import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {
  DEFAULT_READER_FORMAT_V1,READER_FORMAT_STORAGE_KEY_V1,READER_FORMAT_CHANGE_EVENT_V1,
  type ReaderFormatV1,validateReaderFormatV1,suggestReaderFormatV1,
} from '@/lib/reader-format/readerFormatV1';
import {type DisplayFxSnapshotV1} from '@/lib/reader-format/annotateDisplayValuesV1';

type ReaderFormatContextV1={
  prefs:ReaderFormatV1;setPrefs:(next:ReaderFormatV1)=>void;
  fx:DisplayFxSnapshotV1|null;fxStatus:'idle'|'loading'|'ready'|'unavailable';ensureFx:()=>void;
};
const Context=createContext<ReaderFormatContextV1|null>(null);

export function ReaderFormatProvider({children}:{children:ReactNode}) {
  const [prefs,commitPrefs]=useState<ReaderFormatV1>(DEFAULT_READER_FORMAT_V1);
  const [fx,setFx]=useState<DisplayFxSnapshotV1|null>(null);
  const [fxStatus,setFxStatus]=useState<ReaderFormatContextV1['fxStatus']>('idle');
  const requested=useRef(false);

  useEffect(()=>{
    function sync(){
      try {
        const raw=window.localStorage.getItem(READER_FORMAT_STORAGE_KEY_V1);
        const stored=raw?validateReaderFormatV1(JSON.parse(raw) as unknown):null;
        commitPrefs(stored??suggestReaderFormatV1(navigator.language));
      }catch {commitPrefs(suggestReaderFormatV1(navigator.language));}
    }
    sync();
    function onStorage(event:StorageEvent){if(event.key===READER_FORMAT_STORAGE_KEY_V1)sync();}
    window.addEventListener('storage',onStorage);
    return()=>window.removeEventListener('storage',onStorage);
  },[]);

  const setPrefs=useCallback((next:ReaderFormatV1)=>{
    const safe=validateReaderFormatV1(next);
    if(!safe)return;
    commitPrefs(safe);
    try {window.localStorage.setItem(READER_FORMAT_STORAGE_KEY_V1,JSON.stringify(safe));} catch { /* privacy mode */ }
    window.dispatchEvent(new Event(READER_FORMAT_CHANGE_EVENT_V1));
  },[]);

  const ensureFx=useCallback(()=>{
    if(requested.current)return;
    requested.current=true;
    setFxStatus('loading');
    void fetch('/api/feed/reader-display-fx',{credentials:'same-origin',cache:'no-store'})
      .then(async response=>{
        if(!response.ok)throw new Error('READER_FX_UNAVAILABLE');
        const raw:unknown=await response.json();
        if(!raw||typeof raw!=='object'||!('ok' in raw) || (raw as {ok:unknown}).ok!==true)throw new Error('READER_FX_INVALID');
        const data=raw as {ratesPerEur?:DisplayFxSnapshotV1['ratesPerEur'];sources?:DisplayFxSnapshotV1['sources']};
        if(!data.ratesPerEur||!Array.isArray(data.sources))throw new Error('READER_FX_INVALID');
        setFx({ratesPerEur:data.ratesPerEur,sources:data.sources});
        setFxStatus('ready');
      })
      .catch(()=>setFxStatus('unavailable'));
  },[]);
  const value=useMemo(()=>({prefs,setPrefs,fx,fxStatus,ensureFx}),[prefs,setPrefs,fx,fxStatus,ensureFx]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useReaderFormatV1(){
  const value=useContext(Context);
  if(!value)throw new Error('READER_FORMAT_PROVIDER_REQUIRED');
  return value;
}
