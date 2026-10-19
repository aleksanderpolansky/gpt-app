'use client';
import {useEffect,useMemo} from 'react';
import {useReaderFormatV1} from '@/components/app-shell/reader-format-provider';
import {type LocaleCode} from '@/i18n';
import {annotateDisplayValuesV1} from '@/lib/reader-format/annotateDisplayValuesV1';

const LOCALES:Record<LocaleCode,string>={en:'en-GB',pl:'pl-PL',ru:'ru-RU',uk:'uk-UA',de:'de-DE',es:'es-ES',cs:'cs-CZ'};
export default function ReaderConvertedText({text,locale}:{text:string;locale:LocaleCode}) {
  const {prefs,fx,ensureFx}=useReaderFormatV1();
  useEffect(()=>{
    if(/(?:€|£|₴|\$|\b(?:EUR|PLN|UAH|USD|GBP|CZK|euro|euros|dollars?)\b|евро|євро|грн|доллар|долар|крон|корун|zł|Kč)/iu.test(text)) ensureFx();
  },[text,ensureFx]);
  const parts=useMemo(()=>annotateDisplayValuesV1(text,prefs.currency,prefs.units,fx,LOCALES[locale]),[text,prefs,fx,locale]);
  return <>{parts.map((part,index)=><span key={index}>
    {part.original}{part.annotation?<span className="text-[#64748b]" title={part.tooltip??undefined}> ({part.annotation})</span>:null}
  </span>)}</>;
}
