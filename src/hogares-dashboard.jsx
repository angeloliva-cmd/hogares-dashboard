import { useState, useMemo, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Treemap } from "recharts";

const PRIMARY = "#BC5A3A";
const SECONDARY = "#2C4324";
const ACCENT3 = "#D4845F";
const ACCENT4 = "#4A7A40";
const LIGHT_PRIMARY = "#F5EDE8";
const LIGHT_SECONDARY = "#E8EDE7";
const BG = "#F7F5F3";
const CARD = "#FFFFFF";
const TEXT = "#1A1A1A";
const MUTED = "#6B7280";
const BORDER = "#E5E0DB";
const COLORS = [PRIMARY, SECONDARY, "#D4845F", "#4A7A40", "#E8A882", "#6B9E61", "#C47A55", "#3D6B32"];
const STATUS_COLORS = {"Construido":SECONDARY,"En Construcción":PRIMARY,"En Aprobación":ACCENT3,"En entrega de materiales":"#7C5CBF","Censado":"#94a3b8"};
const STATUS_ICONS  = {"Construido":"✅","En Construcción":"🔨","En Aprobación":"📋","En entrega de materiales":"📦","Censado":"📍"};

// ─────────────────────────────────────────────────────────────────────────────
// ⚙️  CONFIGURACIÓN DE DATOS
// Pega la URL de tu Google Sheets CSV aquí (ver guía de instalación):
const SHEETS_CSV_URL = "https://script.google.com/macros/s/AKfycby4F8iDI3pWYQCHG3PTgSJCe3KG9ZbuLnGiP801_Pk/dev";
// Ejemplo: "https://script.google.com/macros/s/AKfycby4F8iDI3pWYQCHG3PTgSJCe3KG9ZbuLnGiP801_Pk/dev"
// ─────────────────────────────────────────────────────────────────────────────

// Mapeo de columnas CSV → objeto de beneficiario
// Los nombres deben coincidir exactamente con los encabezados de tu hoja
const parseRow = (r) => ({
  anio:             Number(r.anio)              || new Date().getFullYear(),
  comunidad:        r.comunidad                 || "",
  codigo:           r.codigo                    || "",
  nombre:           r.nombre                    || "",
  edad:             Number(r.edad)              || 0,
  estado_civil:     r.estado_civil              || "",
  profesion:        r.profesion                 || "",
  pared:            r.pared                     || "",
  agua:             r.agua                      || "No",
  drenaje:          r.drenaje                   || "",
  ingreso:          Number(r.ingreso)           || 0,
  egreso:           Number(r.egreso)            || 0,
  sabe_leer:        r.sabe_leer                 || "",
  sabe_escribir:    r.sabe_escribir             || "",
  sabe_firmar:      r.sabe_firmar               || "",
  dependientes:     Number(r.dependientes)      || 0,
  inversion_total:  Number(r.inversion_total)   || 0,
  inversion_hogares:Number(r.inversion_hogares) || 0,
  inversion_licencia:Number(r.inversion_licencia)||0,
  contrapartida:    Number(r.contrapartida)     || 0,
  area_m2:          Number(r.area_m2)           || 36,
  status:           r.status                    || "Censado",
  avance:           Number(r.avance)            || 0,
  lat:              Number(r.lat)               || 0,
  lng:              Number(r.lng)               || 0,
});

// Parser CSV manual (sin dependencias externas)
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    vals.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").replace(/^"|"$/g, ""); });
    return parseRow(obj);
  }).filter(r => r.codigo && r.lat && r.lng);
}

const SAMPLE_DATA = [
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125001",nombre:"Andrea Maribel Vicente Boror",edad:18,estado_civil:"Unido",profesion:"Ama de casa",pared:"Lamina",agua:"Si",drenaje:"Pozo ciego",ingreso:3000,egreso:2900,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"Si",dependientes:2,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.744329,lng:-90.655727},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125002",nombre:"María Luisa Top Coc de Puluc",edad:30,estado_civil:"Casado",profesion:"Trabajos domesticos",pared:"Lamina",agua:"Si",drenaje:"Pozo ciego",ingreso:3000,egreso:900,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"Si",dependientes:2,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.746746,lng:-90.665739},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125003",nombre:"Eligió Puluc Chajon",edad:79,estado_civil:"Casado",profesion:"Agricultor",pared:"Adobe lamina",agua:"Si",drenaje:"Pozo ciego",ingreso:1500,egreso:1500,sabe_leer:"No",sabe_escribir:"No",sabe_firmar:"No",dependientes:5,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.744061,lng:-90.655286},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125004",nombre:"Ana Rosalina Puluc Guamuch de Top",edad:29,estado_civil:"Casado",profesion:"Ama de casa",pared:"Lamina",agua:"Si",drenaje:"Fosa septica",ingreso:2400,egreso:2200,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"Si",dependientes:3,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.750231,lng:-90.665298},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125005",nombre:"Marta Silvia Boror Orellana",edad:26,estado_civil:"Casado",profesion:"Ama de Casa",pared:"Lamina",agua:"No",drenaje:"Pozo ciego",ingreso:1400,egreso:1400,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"Si",dependientes:3,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.744273,lng:-90.661848},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125006",nombre:"Modesta Iquic Guamuch",edad:67,estado_civil:"Casado",profesion:"Ama de casa",pared:"Block",agua:"No",drenaje:"Pozo ciego",ingreso:1600,egreso:1000,sabe_leer:"No",sabe_escribir:"No",sabe_firmar:"No",dependientes:5,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.758467,lng:-90.663099},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125007",nombre:"María Reyna Puluc Iquic",edad:38,estado_civil:"Soltero",profesion:"Ama de casa",pared:"Lamina madera",agua:"Si",drenaje:"Pozo ciego",ingreso:1000,egreso:1000,sabe_leer:"No",sabe_escribir:"No",sabe_firmar:"No",dependientes:2,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.744078,lng:-90.655318},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125008",nombre:"María Vicente Iquic de Sian",edad:50,estado_civil:"Casado",profesion:"Ama de casa",pared:"Adobe lamina",agua:"No",drenaje:"Pozo ciego",ingreso:2000,egreso:1500,sabe_leer:"No",sabe_escribir:"No",sabe_firmar:"No",dependientes:5,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.75803,lng:-90.663066},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125009",nombre:"Marta Silvia Iquic Cuxe",edad:21,estado_civil:"Unido",profesion:"Ama de casa",pared:"Block",agua:"No",drenaje:"Pozo ciego",ingreso:1500,egreso:1000,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"Si",dependientes:3,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.758235,lng:-90.662995},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125010",nombre:"María Blanca Estela Aquí No Patzan",edad:24,estado_civil:"Unido",profesion:"Trabajos domesticos",pared:"Lamina",agua:"Si",drenaje:"Pozo ciego",ingreso:1200,egreso:800,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"Si",dependientes:1,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.749218,lng:-90.666869},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125011",nombre:"Ana Sofia Cuxé Iquic de Vicente",edad:41,estado_civil:"Viudo",profesion:"Ama de casa",pared:"Lamina",agua:"Si",drenaje:"Letrina Ventilada",ingreso:350,egreso:350,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"Si",dependientes:7,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.743352,lng:-90.656787},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125012",nombre:"Héctor Bernardo Sian Vicente",edad:25,estado_civil:"Unido",profesion:"Guardia de seguridad",pared:"Lamina",agua:"No",drenaje:"Pozo ciego",ingreso:2000,egreso:1500,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"Si",dependientes:4,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.758171,lng:-90.66309},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125013",nombre:"Irme Odily Iquic Iquic",edad:28,estado_civil:"Soltero",profesion:"Trabajos domesticos",pared:"Lamina",agua:"Si",drenaje:"Pozo ciego",ingreso:0,egreso:0,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"Si",dependientes:1,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.749246,lng:-90.666999},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125014",nombre:"Benito Iquic Cuxe",edad:56,estado_civil:"Casado",profesion:"Agricultor",pared:"Block lamina",agua:"Si",drenaje:"Pozo ciego",ingreso:2000,egreso:2000,sabe_leer:"No",sabe_escribir:"No",sabe_firmar:"No",dependientes:4,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.745456,lng:-90.660819},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125015",nombre:"Maria Julia Pirir Tubac de Pirir",edad:39,estado_civil:"Casado",profesion:"Ama de casa",pared:"Block",agua:"Si",drenaje:"Pozo ciego",ingreso:3000,egreso:2800,sabe_leer:"No",sabe_escribir:"No",sabe_firmar:"No",dependientes:7,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.741314,lng:-90.656521},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125016",nombre:"María Isabel Sian Chavez",edad:29,estado_civil:"Casado",profesion:"Ama de casa",pared:"Block",agua:"No",drenaje:"Pozo ciego",ingreso:2000,egreso:1500,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"Si",dependientes:2,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.757907,lng:-90.663184},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125017",nombre:"Ana Gricelda Guamuch Cuxe de Iquic",edad:33,estado_civil:"Casado",profesion:"Ama de casa",pared:"Block",agua:"Si",drenaje:"Pozo ciego",ingreso:2000,egreso:2000,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"Si",dependientes:7,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.745498,lng:-90.660491},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125018",nombre:"María Francisca Iquic Sian",edad:40,estado_civil:"Unido",profesion:"Ninguno",pared:"Lamina madera",agua:"Si",drenaje:"Pozo ciego",ingreso:1400,egreso:1000,sabe_leer:"",sabe_escribir:"",sabe_firmar:"No",dependientes:5,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.749304,lng:-90.667204},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125019",nombre:"Juan Iquic Ayapan",edad:58,estado_civil:"Casado",profesion:"Agricultor",pared:"Block",agua:"No",drenaje:"Pozo ciego",ingreso:1800,egreso:1000,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"Si",dependientes:2,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.757855,lng:-90.663377},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125020",nombre:"Martina Chajon Pulex de Iquic",edad:39,estado_civil:"Casado",profesion:"Ama de casa",pared:"Lamina",agua:"Si",drenaje:"Pozo ciego",ingreso:1200,egreso:1200,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"Si",dependientes:2,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.745094,lng:-90.660883},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125021",nombre:"Francisca Sequen Rompich",edad:30,estado_civil:"Soltero",profesion:"Tejedor",pared:"Madera",agua:"Si",drenaje:"Pozo ciego",ingreso:200,egreso:200,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"No",dependientes:4,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.741646,lng:-90.658761},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125022",nombre:"María Marta Bertalina Sian Iquic",edad:43,estado_civil:"Casado",profesion:"Ama de casa",pared:"Lamina",agua:"No",drenaje:"Pozo ciego",ingreso:1500,egreso:800,sabe_leer:"No",sabe_escribir:"No",sabe_firmar:"No",dependientes:3,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.75763,lng:-90.663407},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125023",nombre:"Maria Sequen Rompich de Cheley",edad:42,estado_civil:"Casado",profesion:"Tejedor",pared:"Block lamina",agua:"Si",drenaje:"Pozo ciego",ingreso:1500,egreso:1500,sabe_leer:"No",sabe_escribir:"No",sabe_firmar:"No",dependientes:7,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.741244,lng:-90.658779},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125024",nombre:"María Aurelia Cuxe Iquic",edad:48,estado_civil:"Casado",profesion:"Ama de casa",pared:"Block lamina",agua:"No",drenaje:"Pozo ciego",ingreso:1800,egreso:1200,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"Si",dependientes:7,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.757523,lng:-90.663494},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125025",nombre:"Valentina Sian yquic de Iquic",edad:62,estado_civil:"Casado",profesion:"Trabajos domesticos",pared:"Lamina",agua:"Si",drenaje:"Pozo ciego",ingreso:1200,egreso:1000,sabe_leer:"No",sabe_escribir:"No",sabe_firmar:"No",dependientes:7,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.748921,lng:-90.665589},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125026",nombre:"Rosa Maria Equite Tubac",edad:37,estado_civil:"Casado",profesion:"Ama de casa",pared:"Lamina",agua:"Si",drenaje:"Pozo ciego",ingreso:600,egreso:600,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"Si",dependientes:5,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.746384,lng:-90.660064},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125027",nombre:"María Marta Iquic Puluc de Boch",edad:30,estado_civil:"Casado",profesion:"Ama de casa",pared:"Block lamina",agua:"Si",drenaje:"Pozo ciego",ingreso:2000,egreso:1800,sabe_leer:"No",sabe_escribir:"No",sabe_firmar:"No",dependientes:5,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.742736,lng:-90.660489},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125028",nombre:"Bernardina Iquic Sian de Tuquer",edad:49,estado_civil:"Casado",profesion:"Trabajos domesticos",pared:"Adobe lamina",agua:"Si",drenaje:"Pozo ciego",ingreso:1600,egreso:1200,sabe_leer:"No",sabe_escribir:"No",sabe_firmar:"No",dependientes:7,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.748796,lng:-90.665862},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125029",nombre:"Tomas Vicente Cuxe",edad:73,estado_civil:"Casado",profesion:"Agricultor",pared:"Block lamina",agua:"No",drenaje:"Pozo ciego",ingreso:1200,egreso:500,sabe_leer:"Si",sabe_escribir:"Si",sabe_firmar:"Si",dependientes:2,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.755867,lng:-90.661773},
  {anio:2024,region:1,comunidad:"Asunción Chivoc",codigo:"R125030",nombre:"Miriam Leticia de León Saban",edad:28,estado_civil:"Unido",profesion:"Trabajos domesticos",pared:"Lamina",agua:"No",drenaje:"Pozo ciego",ingreso:2000,egreso:1000,sabe_leer:"No",sabe_escribir:"No",sabe_firmar:"No",dependientes:1,inversion_total:3100,inversion_hogares:1050,inversion_licencia:2050,contrapartida:1700,area_m2:36,status:"Construido",avance:1,lat:14.748908,lng:-90.665608},
];

function GaugeTriple({items}) {
  const r=52, cx=70, cy=68;
  const arc=(pct,color)=>{
    const a=Math.PI-(pct/100)*Math.PI;
    const x1=cx+r*Math.cos(Math.PI), y1=cy+r*Math.sin(Math.PI);
    const x2=cx+r*Math.cos(a), y2=cy+r*Math.sin(a);
    const large=pct>50?1:0;
    return `M${x1},${y1} A${r},${r} 0 ${large} 0 ${x2},${y2}`;
  };
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
      {items.map((item,i)=>(
        <div key={i} style={{textAlign:"center"}}>
          <svg viewBox="0 0 140 80" style={{width:"100%"}}>
            <path d={`M${cx-r},${cy} A${r},${r} 0 1 1 ${cx+r},${cy}`} fill="none" stroke="#E5E0DB" strokeWidth={10} strokeLinecap="round"/>
            <path d={arc(item.pct,item.color)} fill="none" stroke={item.color} strokeWidth={10} strokeLinecap="round"/>
            <text x={cx} y={cy-8} textAnchor="middle" fontSize="18" fontWeight="800" fill={item.color}>{item.pct}%</text>
            <text x={cx} y={cy+8} textAnchor="middle" fontSize="9" fill={MUTED}>{item.count}/{item.total}</text>
          </svg>
          <div style={{fontSize:11,fontWeight:700,color:TEXT,marginTop:-8}}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

function BeeswarmEdades({data}) {
  const w=500, h=100, pad=30;
  const minE=Math.min(...data.map(r=>r.edad)), maxE=Math.max(...data.map(r=>r.edad));
  const xScale=e=>pad+(e-minE)/(maxE-minE)*(w-pad*2);
  const EC_COLORS={"Casado":SECONDARY,"Unido":PRIMARY,"Soltero":ACCENT3,"Viudo":"#94a3b8"};
  const dots=data.map((r,i)=>({...r,x:xScale(r.edad),y:h/2+(i%5-2)*12}));
  const ticks=[18,25,35,45,55,65,79];
  const ecs=[...new Set(data.map(r=>r.estado_civil))];
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h+30}`} style={{width:"100%"}}>
        <line x1={pad} y1={h/2} x2={w-pad} y2={h/2} stroke={BORDER} strokeWidth={1}/>
        {ticks.map(t=>(
          <g key={t}>
            <line x1={xScale(t)} y1={h/2-4} x2={xScale(t)} y2={h/2+4} stroke={MUTED} strokeWidth={1}/>
            <text x={xScale(t)} y={h/2+16} textAnchor="middle" fontSize="9" fill={MUTED}>{t}</text>
          </g>
        ))}
        {dots.map((d,i)=>(
          <circle key={i} cx={d.x} cy={d.y} r={6} fill={EC_COLORS[d.estado_civil]||ACCENT3} opacity={0.85}>
            <title>{d.nombre} · {d.edad} años · {d.estado_civil}</title>
          </circle>
        ))}
      </svg>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:4}}>
        {ecs.map(ec=>(
          <div key={ec} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:EC_COLORS[ec]||ACCENT3}}/>
            <span style={{fontSize:10,color:MUTED}}>{ec}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PiramideIngresos({data}) {
  const grupos={"18-30":[],"31-40":[],"41-50":[],"51-60":[],"61+":[]};
  data.forEach(r=>{
    const g=r.edad<=30?"18-30":r.edad<=40?"31-40":r.edad<=50?"41-50":r.edad<=60?"51-60":"61+";
    grupos[g].push(r);
  });
  const rows=Object.entries(grupos).map(([g,arr])=>{
    const vi=arr.filter(r=>r.ingreso>0), ve=arr.filter(r=>r.egreso>0);
    return{g,ing:vi.length?Math.round(vi.reduce((s,r)=>s+r.ingreso,0)/vi.length):0,egr:ve.length?Math.round(ve.reduce((s,r)=>s+r.egreso,0)/ve.length):0};
  });
  const maxVal=Math.max(...rows.flatMap(r=>[r.ing,r.egr]),1);
  const barW=180;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",justifyContent:"center",gap:20,marginBottom:4}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:12,height:12,borderRadius:2,background:SECONDARY}}/><span style={{fontSize:11,color:MUTED}}>Ingreso promedio</span></div>
        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:12,height:12,borderRadius:2,background:PRIMARY}}/><span style={{fontSize:11,color:MUTED}}>Egreso promedio</span></div>
      </div>
      {rows.map(({g,ing,egr},i)=>{
        const ingW=Math.round((ing/maxVal)*barW);
        const egrW=Math.round((egr/maxVal)*barW);
        const balance=ing-egr;
        return (
          <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:42,textAlign:"right",fontSize:11,fontWeight:700,color:MUTED,flexShrink:0}}>{g}</div>
            <div style={{display:"flex",alignItems:"center",width:barW,justifyContent:"flex-end"}}>
              <div style={{height:20,width:ingW,background:SECONDARY,borderRadius:"4px 0 0 4px",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:4}}>
                {ingW>40 && <span style={{fontSize:9,color:"white",fontWeight:700}}>Q{ing.toLocaleString()}</span>}
              </div>
            </div>
            <div style={{width:2,height:28,background:BORDER,flexShrink:0}}/>
            <div style={{display:"flex",alignItems:"center",width:barW}}>
              <div style={{height:20,width:egrW,background:PRIMARY,borderRadius:"0 4px 4px 0",display:"flex",alignItems:"center",paddingLeft:4}}>
                {egrW>40 && <span style={{fontSize:9,color:"white",fontWeight:700}}>Q{egr.toLocaleString()}</span>}
              </div>
            </div>
            <div style={{width:48,fontSize:10,fontWeight:700,color:balance>=0?ACCENT4:PRIMARY,flexShrink:0}}>
              {balance>=0?"+":""}{balance.toLocaleString()}
            </div>
          </div>
        );
      })}
      <div style={{fontSize:10,color:MUTED,textAlign:"center",marginTop:4}}>← Ingreso promedio · Egreso promedio → · Balance al final</div>
    </div>
  );
}

function DonutAnidado({data}) {
  const profMap={};data.forEach(r=>{const p=r.profesion||"Sin dato";profMap[p]=(profMap[p]||0)+1;});
  const profData=Object.entries(profMap).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({name:k,value:v}));
  const ecMap={};data.forEach(r=>{ecMap[r.estado_civil]=(ecMap[r.estado_civil]||0)+1;});
  const ecData=Object.entries(ecMap).map(([k,v])=>({name:k,value:v}));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={ecData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={({name,value})=>`${value}`} labelLine={false}>
          {ecData.map((e,i)=><Cell key={i} fill={[SECONDARY,PRIMARY,ACCENT3,"#94a3b8"][i%4]}/>)}
        </Pie>
        <Pie data={profData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={95}>
          {profData.map((e,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} opacity={0.85}/>)}
        </Pie>
        <Tooltip contentStyle={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,fontSize:11}} formatter={(v,n)=>[v,n]}/>
        <Legend formatter={v=><span style={{fontSize:10,color:TEXT}}>{v}</span>} wrapperStyle={{fontSize:10}}/>
      </PieChart>
    </ResponsiveContainer>
  );
}

function HeatmapParedAgua({data}) {
  const paredes=[...new Set(data.map(r=>r.pared))].sort();
  const cells=paredes.map(p=>{
    const rows=data.filter(r=>r.pared===p);
    const conAgua=rows.filter(r=>r.agua==="Si").length;
    const sinAgua=rows.filter(r=>r.agua==="No").length;
    return{pared:p,conAgua,sinAgua,total:rows.length};
  });
  const maxVal=Math.max(...cells.flatMap(c=>[c.conAgua,c.sinAgua]),1);
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"separate",borderSpacing:4}}>
        <thead>
          <tr>
            <th style={{fontSize:10,color:MUTED,fontWeight:600,textAlign:"left",padding:"4px 8px"}}>Material de pared</th>
            <th style={{fontSize:10,color:SECONDARY,fontWeight:700,textAlign:"center",padding:"4px 8px"}}>💧 Con agua</th>
            <th style={{fontSize:10,color:PRIMARY,fontWeight:700,textAlign:"center",padding:"4px 8px"}}>🚫 Sin agua</th>
            <th style={{fontSize:10,color:MUTED,fontWeight:600,textAlign:"center",padding:"4px 8px"}}>Total</th>
          </tr>
        </thead>
        <tbody>
          {cells.map((c,i)=>(
            <tr key={i}>
              <td style={{fontSize:11,color:TEXT,fontWeight:600,padding:"4px 8px",whiteSpace:"nowrap"}}>{c.pared}</td>
              <td style={{padding:"3px 4px",textAlign:"center"}}>
                <div style={{background:`rgba(44,67,36,${0.15+c.conAgua/maxVal*0.85})`,borderRadius:6,padding:"6px 4px",fontSize:12,fontWeight:700,color:c.conAgua>0?SECONDARY:MUTED}}>{c.conAgua}</div>
              </td>
              <td style={{padding:"3px 4px",textAlign:"center"}}>
                <div style={{background:`rgba(188,90,58,${0.15+c.sinAgua/maxVal*0.85})`,borderRadius:6,padding:"6px 4px",fontSize:12,fontWeight:700,color:c.sinAgua>0?PRIMARY:MUTED}}>{c.sinAgua}</div>
              </td>
              <td style={{padding:"3px 4px",textAlign:"center"}}>
                <span style={{fontSize:11,color:MUTED,fontWeight:600}}>{c.total}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{fontSize:10,color:MUTED,marginTop:8,textAlign:"center"}}>Mayor intensidad de color = mayor concentración de hogares</div>
    </div>
  );
}

function Hogometro({pct,construidos,censados}) {
  const r=90,cx=130,cy=120;
  const angle=Math.PI-(pct/100)*Math.PI;
  const arcX=a=>cx+r*Math.cos(a), arcY=a=>cy+r*Math.sin(a);
  const describeArc=(a1,a2)=>{const x1=arcX(a1),y1=arcY(a1),x2=arcX(a2),y2=arcY(a2);const large=Math.abs(a2-a1)>Math.PI?1:0;return `M${x1},${y1} A${r},${r} 0 ${large} 0 ${x2},${y2}`;};
  const needleX=cx+(r-15)*Math.cos(angle), needleY=cy+(r-15)*Math.sin(angle);
  return (
    <svg viewBox="0 0 260 145" style={{width:"100%",maxWidth:300}}>
      <path d={describeArc(Math.PI,0)} fill="none" stroke="#E5E0DB" strokeWidth={18} strokeLinecap="round"/>
      <path d={describeArc(Math.PI,Math.PI-(pct/100)*Math.PI)} fill="none" stroke="url(#gauge-grad)" strokeWidth={18} strokeLinecap="round"/>
      <defs><linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={PRIMARY}/><stop offset="100%" stopColor={SECONDARY}/></linearGradient></defs>
      {[0,25,50,75,100].map(t=>{const a=Math.PI-(t/100)*Math.PI;return <text key={t} x={cx+(r+8)*Math.cos(a)} y={cy+(r+8)*Math.sin(a)} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill={MUTED}>{t}%</text>;})}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={PRIMARY} strokeWidth={3} strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r={7} fill={PRIMARY}/><circle cx={cx} cy={cy} r={3} fill="white"/>
      <text x={cx} y={cy+22} textAnchor="middle" fontSize="26" fontWeight="800" fill={SECONDARY}>{construidos}</text>
      <text x={cx} y={cy+38} textAnchor="middle" fontSize="10" fill={MUTED}>de {censados} censados</text>
      <text x={cx} y={cy+52} textAnchor="middle" fontSize="11" fontWeight="700" fill={PRIMARY}>{pct.toFixed(1)}% completado</text>
    </svg>
  );
}

function WaffleChart({data,total}) {
  const cols=10,size=22,gap=4;
  const items=[];let idx=0;
  data.forEach(({status,count,color})=>{for(let i=0;i<count;i++)items.push({status,color,idx:idx++});});
  while(items.length<total)items.push({status:"Pendiente",color:"#E5E0DB",idx:idx++});
  return (
    <svg viewBox={`0 0 ${cols*(size+gap)} ${Math.ceil(total/cols)*(size+gap)+10}`} style={{width:"100%"}}>
      {items.map((item,i)=>{const col=i%cols,row=Math.floor(i/cols),x=col*(size+gap),y=row*(size+gap);return(<g key={i}><rect x={x} y={y} width={size} height={size} rx={4} fill={item.color} opacity={item.status==="Pendiente"?0.3:1}/><text x={x+size/2} y={y+size/2+1} textAnchor="middle" dominantBaseline="middle" fontSize="12">🏠</text></g>);})}
    </svg>
  );
}

const TreemapContent=({x,y,width,height,name,value,color})=>{if(!width||!height||width<20||height<20)return null;return(<g><rect x={x+2} y={y+2} width={width-4} height={height-4} rx={8} fill={color} opacity={0.92}/>{width>60&&height>40&&<><text x={x+width/2} y={y+height/2-8} textAnchor="middle" fill="white" fontSize={Math.min(13,width/8)} fontWeight="700">{name}</text><text x={x+width/2} y={y+height/2+10} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={Math.min(11,width/9)}>Q{value.toLocaleString()}</text></>}</g>);};

function RegionProgress({regiones}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {regiones.map((r,i)=>{
        const pct=r.total?Math.round(r.construidos/r.total*100):0;
        return (
          <div key={i}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{background:LIGHT_SECONDARY,color:SECONDARY,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:8}}>Región {r.region}</span>
                <span style={{fontSize:12,color:TEXT,fontWeight:600}}>{r.construidos} construidos</span>
              </div>
              <span style={{fontSize:13,fontWeight:800,color:pct===100?SECONDARY:PRIMARY}}>{pct}%</span>
            </div>
            <div style={{background:"#E5E0DB",borderRadius:20,height:14,overflow:"hidden"}}>
              <div style={{width:`${pct}%`,height:"100%",borderRadius:20,background:`linear-gradient(90deg,${PRIMARY},${SECONDARY})`,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:4}}>
                {pct>15&&<span style={{fontSize:9,color:"white",fontWeight:700}}>{r.construidos}/{r.total}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const KPICard=({title,value,sub,icon,accent=PRIMARY})=>(
  <div style={{background:CARD,borderRadius:12,padding:"18px",border:`1px solid ${BORDER}`,borderTop:`4px solid ${accent}`,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>
        <div style={{color:MUTED,fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>{title}</div>
        <div style={{color:TEXT,fontSize:24,fontWeight:700,lineHeight:1}}>{value}</div>
        {sub&&<div style={{color:MUTED,fontSize:10,marginTop:5}}>{sub}</div>}
      </div>
      <div style={{fontSize:20,opacity:0.7}}>{icon}</div>
    </div>
  </div>
);

const CustomTooltip=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return(<div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,padding:"10px 14px",boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}><div style={{fontWeight:600,color:TEXT,marginBottom:4,fontSize:12}}>{label||payload[0]?.name}</div>{payload.map((p,i)=><div key={i} style={{color:p.fill||p.color||PRIMARY,fontSize:12}}>{p.name}: {typeof p.value==="number"&&p.value>100?`Q${p.value.toLocaleString()}`:p.value}</div>)}</div>);
};

function MapaTab({data}) {
  const mapRef=useRef(null),instanceRef=useRef(null);
  const [statusFilter,setStatusFilter]=useState("Todos");

  const statuses = ["Todos",...Object.keys(STATUS_COLORS).filter(s=>s!=="Censado")];
  const filtered  = statusFilter==="Todos" ? data : data.filter(r=>r.status===statusFilter);

  useEffect(()=>{
    if(instanceRef.current){instanceRef.current.remove();instanceRef.current=null;}
    const init=()=>{
      if(!mapRef.current||instanceRef.current)return;
      const L=window.L;
      const pts = filtered.length ? filtered : data;
      const center=[pts.reduce((s,r)=>s+r.lat,0)/pts.length, pts.reduce((s,r)=>s+r.lng,0)/pts.length];
      const map=L.map(mapRef.current,{zoomControl:true}).setView(center,14);
      instanceRef.current=map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap",maxZoom:19}).addTo(map);

      filtered.forEach(r=>{
        const color  = STATUS_COLORS[r.status] || "#94a3b8";
        const icon2  = STATUS_ICONS[r.status]  || "📍";
        const icon=L.divIcon({
          className:"",
          html:`<div style="width:32px;height:32px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
                  <span style="font-size:13px;">${icon2}</span>
                </div>`,
          iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-18]
        });
        L.marker([r.lat,r.lng],{icon}).addTo(map).bindPopup(
          `<div style="font-family:'Segoe UI',sans-serif;min-width:210px;padding:4px;">
            <div style="font-weight:700;color:${SECONDARY};font-size:13px;">${r.codigo} · Región ${r.region}</div>
            <div style="font-size:12px;color:#333;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:6px;">${r.nombre}</div>
            <div style="display:inline-block;background:${color}22;color:${color};border:1px solid ${color}55;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;margin-bottom:8px;">${icon2} ${r.status}</div>
            <div style="font-size:11px;color:#555;line-height:1.9;">
              🎂 ${r.edad} años &nbsp;·&nbsp; 👨‍👩‍👧 ${r.dependientes} dependientes<br/>
              💼 ${r.profesion}<br/>
              💧 ${r.agua==="Si"?"✓ Con agua potable":"✗ Sin agua potable"}<br/>
              💰 Ingreso Q${r.ingreso.toLocaleString()}
            </div>
          </div>`,
          {maxWidth:270}
        );
      });
    };
    if(!window.L){
      const link=document.createElement("link");link.rel="stylesheet";
      link.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);
      const sc=document.createElement("script");sc.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      sc.onload=init;document.head.appendChild(sc);
    } else init();
    return()=>{if(instanceRef.current){instanceRef.current.remove();instanceRef.current=null;}};
  },[statusFilter,filtered]);

  // Conteo por status
  const counts = Object.keys(STATUS_COLORS).filter(s=>s!=="Censado").map(s=>({
    status:s, count:data.filter(r=>r.status===s).length, color:STATUS_COLORS[s], icon:STATUS_ICONS[s]
  })).filter(s=>s.count>0);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Barra de control */}
      <div style={{background:CARD,borderRadius:12,padding:"14px 20px",border:`1px solid ${BORDER}`,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{fontSize:13,fontWeight:700,color:SECONDARY}}>Filtrar por Status:</div>
        {statuses.map(s=>{
          const color = s==="Todos" ? SECONDARY : STATUS_COLORS[s];
          const icon  = s==="Todos" ? "🗺️"      : STATUS_ICONS[s];
          const cnt   = s==="Todos" ? data.length : data.filter(r=>r.status===s).length;
          const active= statusFilter===s;
          return (
            <button key={s} onClick={()=>setStatusFilter(s)} style={{
              display:"flex",alignItems:"center",gap:6,
              padding:"6px 14px",borderRadius:20,cursor:"pointer",
              border:`1.5px solid ${active?color:BORDER}`,
              background:active?`${color}18`:CARD,
              color:active?color:MUTED,
              fontSize:12,fontWeight:600,
            }}>
              <span style={{fontSize:13}}>{icon}</span>
              {s==="Todos"?"Todos":s}
              <span style={{
                background:active?color:"#E5E0DB",color:active?"white":MUTED,
                borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700,
              }}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* Resumen mini KPIs */}
      <div style={{display:"grid",gridTemplateColumns:`repeat(${counts.length},1fr)`,gap:10}}>
        {counts.map((c,i)=>(
          <div key={i} style={{background:CARD,borderRadius:10,padding:"12px 16px",border:`1px solid ${BORDER}`,borderLeft:`4px solid ${c.color}`,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}
            onClick={()=>setStatusFilter(c.status===statusFilter?"Todos":c.status)}>
            <span style={{fontSize:20}}>{c.icon}</span>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:c.color}}>{c.count}</div>
              <div style={{fontSize:10,color:MUTED,fontWeight:600}}>{c.status}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Mapa */}
      <div style={{background:CARD,borderRadius:12,border:`1px solid ${BORDER}`,overflow:"hidden"}}>
        <div style={{background:SECONDARY,padding:"12px 20px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:16}}>📍</span>
          <span style={{color:"white",fontWeight:700,fontSize:13}}>Geolocalización de Beneficiarios</span>
          <span style={{marginLeft:"auto",background:"rgba(255,255,255,0.15)",color:"white",fontSize:11,padding:"3px 10px",borderRadius:10}}>
            {filtered.length} {filtered.length===1?"punto":"puntos"}{statusFilter!=="Todos"?` · ${statusFilter}`:""}
          </span>
          {/* Leyenda inline */}
          <div style={{display:"flex",gap:12,marginLeft:8,flexWrap:"wrap"}}>
            {counts.map((c,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:11,height:11,borderRadius:"50%",background:c.color,border:"2px solid rgba(255,255,255,0.4)",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.75)"}}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div ref={mapRef} style={{height:480,width:"100%"}}/>
      </div>

      {/* ── Storytellings geográficos ── */}
      {(()=>{
        const toRad = d => d * Math.PI / 180;
        const distKm = (a,b) => {
          const R=6371, dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
          const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
          return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
        };
        let maxDist=0, ptA=data[0], ptB=data[0];
        for(let i=0;i<data.length;i++) for(let j=i+1;j<data.length;j++){
          const d=distKm(data[i],data[j]);
          if(d>maxDist){maxDist=d;ptA=data[i];ptB=data[j];}
        }
        const centerLat=(data.reduce((s,r)=>s+r.lat,0)/data.length).toFixed(4);
        const centerLng=(data.reduce((s,r)=>s+r.lng,0)/data.length).toFixed(4);
        const norte = [...data].sort((a,b)=>b.lat-a.lat)[0];
        const sur   = [...data].sort((a,b)=>a.lat-b.lat)[0];
        const distNS = distKm(norte,sur);
        const areaKm2 = Math.PI * (maxDist/2)**2;
        const densidad = (data.length / areaKm2).toFixed(1);

        return (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>

            <div style={{background:`linear-gradient(135deg,${SECONDARY} 0%,#1e3018 100%)`,borderRadius:12,padding:22,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:-10,bottom:-10,fontSize:90,opacity:0.07}}>📡</div>
              <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.55)",marginBottom:8}}>📡 Cobertura territorial</div>
              <div style={{fontSize:36,fontWeight:800,color:"#c8e6c0",lineHeight:1,marginBottom:6}}>{maxDist.toFixed(2)} km</div>
              <div style={{fontSize:12,fontWeight:700,color:"white",marginBottom:10,lineHeight:1.5}}>separan el hogar más lejano del más cercano dentro del programa</div>
              <div style={{background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"9px 12px",fontSize:10,color:"rgba(255,255,255,0.85)",lineHeight:1.7}}>
                De <b>{ptA.nombre.split(" ").slice(0,2).join(" ")}</b> a <b>{ptB.nombre.split(" ").slice(0,2).join(" ")}</b> — ambos en la misma comunidad, distantes {(maxDist*1000).toFixed(0)} metros. HogaRES actúa con precisión quirúrgica sobre el territorio.
              </div>
            </div>

            <div style={{background:`linear-gradient(135deg,${PRIMARY} 0%,#8b3e25 100%)`,borderRadius:12,padding:22,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:-10,bottom:-10,fontSize:90,opacity:0.07}}>🧭</div>
              <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.55)",marginBottom:8}}>🧭 Dispersión norte–sur</div>
              <div style={{fontSize:36,fontWeight:800,color:"#ffe0d0",lineHeight:1,marginBottom:6}}>{(distNS*1000).toFixed(0)} m</div>
              <div style={{fontSize:12,fontWeight:700,color:"white",marginBottom:10,lineHeight:1.5}}>de extensión vertical entre el hogar más al norte y el más al sur</div>
              <div style={{background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"9px 12px",fontSize:10,color:"rgba(255,255,255,0.85)",lineHeight:1.7}}>
                El hogar más al norte está en <b>{norte.lat.toFixed(4)}°N</b> y el más al sur en <b>{sur.lat.toFixed(4)}°N</b>. En esa franja de terreno viven <b>{data.length} familias</b> que el programa atiende de manera simultánea.
              </div>
            </div>

            <div style={{background:`linear-gradient(135deg,#4A7A40 0%,#2C4324 100%)`,borderRadius:12,padding:22,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:-10,bottom:-10,fontSize:90,opacity:0.07}}>🏘️</div>
              <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.55)",marginBottom:8}}>🏘️ Concentración de impacto</div>
              <div style={{fontSize:36,fontWeight:800,color:"#E8A882",lineHeight:1,marginBottom:6}}>{densidad}</div>
              <div style={{fontSize:12,fontWeight:700,color:"white",marginBottom:10,lineHeight:1.5}}>hogares beneficiados por km² dentro del área de intervención</div>
              <div style={{background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"9px 12px",fontSize:10,color:"rgba(255,255,255,0.85)",lineHeight:1.7}}>
                Centro geográfico del programa: <b>{centerLat}°N, {centerLng}°O</b>. Esa alta densidad reduce costos logísticos y facilita el acompañamiento técnico hogar por hogar.
              </div>
            </div>

          </div>
        );
      })()}
    </div>
  );
}

export default function Dashboard() {
  const [tab,setTab]=useState("resumen");
  const [statusBenef, setStatusBenef] = useState("Todos");
  const [search,setSearch]=useState("");
  const [regionFilter,setRegionFilter]=useState("Todas");
  const [comunidadFilter,setComunidadFilter]=useState("Todas");
  const [anioFilter,setAnioFilter]=useState("Todos");

  // ── Carga de datos ──────────────────────────────────────────────────────────
  const [raw, setRaw]           = useState(SAMPLE_DATA);
  const [loadState, setLoadState] = useState(
    SHEETS_CSV_URL ? "loading" : "sample"
    // "loading" | "ok" | "error" | "sample"
  );
  const [loadMsg, setLoadMsg]   = useState("");
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    if (!SHEETS_CSV_URL) return;
    const load = async () => {
      setLoadState("loading");
      try {
        // Añade un cache-buster para que siempre traiga datos frescos
        const res = await fetch(`${SHEETS_CSV_URL}&_=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const parsed = parseCSV(text);
        if (parsed.length === 0) throw new Error("El CSV está vacío o los encabezados no coinciden");
        setRaw(parsed);
        setLastSync(new Date());
        setLoadState("ok");
      } catch(e) {
        setLoadMsg(e.message);
        setLoadState("error");
        // Conserva SAMPLE_DATA como fallback
      }
    };
    load();
    // Recarga automática cada 5 minutos
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  // ───────────────────────────────────────────────────────────────────────────

  const anios=useMemo(()=>["Todos",...Array.from(new Set(raw.map(r=>r.anio))).sort((a,b)=>a-b).map(String)],[raw]);

  const regiones=useMemo(()=>{
    const base=anioFilter==="Todos"?raw:raw.filter(r=>String(r.anio)===anioFilter);
    return["Todas",...Array.from(new Set(base.map(r=>r.region))).sort((a,b)=>a-b)];
  },[raw,anioFilter]);
  const comunidades=useMemo(()=>{
    let base=anioFilter==="Todos"?raw:raw.filter(r=>String(r.anio)===anioFilter);
    if(regionFilter!=="Todas")base=base.filter(r=>r.region===Number(regionFilter));
    return["Todas",...Array.from(new Set(base.map(r=>r.comunidad))).sort()];
  },[regionFilter,raw,anioFilter]);
  useEffect(()=>setComunidadFilter("Todas"),[regionFilter,anioFilter]);
  useEffect(()=>setRegionFilter("Todas"),[anioFilter]);

  const data=useMemo(()=>{
    let d=anioFilter==="Todos"?raw:raw.filter(r=>String(r.anio)===anioFilter);
    if(regionFilter!=="Todas")d=d.filter(r=>r.region===Number(regionFilter));
    if(comunidadFilter!=="Todas")d=d.filter(r=>r.comunidad===comunidadFilter);
    return d;
  },[regionFilter,comunidadFilter,anioFilter,raw]);

  const filtered=useMemo(()=>data.filter(r=>r.nombre.toLowerCase().includes(search.toLowerCase())||r.codigo.toLowerCase().includes(search.toLowerCase())),[search,data]);

  const construidos=data.filter(r=>r.status==="Construido").length;
  const enConstruccion=data.filter(r=>r.status==="En Construcción").length;
  const enAprobacion=data.filter(r=>r.status==="En Aprobación").length;
  const enEntrega=data.filter(r=>r.status==="En entrega de materiales").length;
  const totalCensados=data.length;
  const pctAvance=totalCensados?Math.round(construidos/totalCensados*100):0;
  const personas=data.reduce((s,r)=>s+r.dependientes+1,0);
  const totalM2=data.reduce((s,r)=>s+(r.area_m2||0),0);
  const totalInv=data.reduce((s,r)=>s+(r.inversion_total||0),0);
  const totalContrapartida=data.reduce((s,r)=>s+(r.contrapartida||0),0);
  const totalHogares=data.reduce((s,r)=>s+(r.inversion_hogares||0),0);
  const totalLicencia=data.reduce((s,r)=>s+(r.inversion_licencia||0),0);
  const waffleData=[
    {status:"Construido",count:construidos,color:SECONDARY},
    {status:"En Construcción",count:enConstruccion,color:PRIMARY},
    {status:"En Aprobación",count:enAprobacion,color:ACCENT3},
    {status:"En entrega de materiales",count:enEntrega,color:"#7C5CBF"},
  ];
  const añosData=useMemo(()=>
    Array.from(new Set(raw.map(r=>r.anio))).sort((a,b)=>a-b).map(anio=>{
      const rows=raw.filter(r=>r.anio===anio);
      return {
        anio:String(anio),
        total:rows.length,
        construidos:rows.filter(r=>r.status==="Construido").length,
        inversion:rows.reduce((s,r)=>s+(r.inversion_total||0),0),
        personas:rows.reduce((s,r)=>s+r.dependientes+1,0),
      };
    })
  ,[raw]);

  const treemapData=[{name:"HogaRES",value:totalHogares,color:SECONDARY},{name:"Lic. Social",value:totalLicencia,color:PRIMARY},{name:"Contrapartida",value:totalContrapartida,color:ACCENT3}];
  const regionesData=Array.from(new Set(raw.map(r=>r.region))).sort().map(reg=>{const rows=raw.filter(r=>r.region===reg);return{region:reg,total:rows.length,construidos:rows.filter(r=>r.status==="Construido").length,enConstruccion:rows.filter(r=>r.status==="En Construccion").length,enAprobacion:rows.filter(r=>r.status==="En Aprobacion").length};});

  const total=data.length;
  const avgEdad=total?Math.round(data.reduce((s,r)=>s+r.edad,0)/total):0;
  const validIng=data.filter(r=>r.ingreso>0);
  const avgIng=validIng.length?Math.round(validIng.reduce((s,r)=>s+r.ingreso,0)/validIng.length):0;
  const conAgua=data.filter(r=>r.agua==="Si").length;
  const saben=data.filter(r=>r.sabe_leer==="Si"&&r.sabe_escribir==="Si").length;
  const firman=data.filter(r=>r.sabe_firmar==="Si").length;
  const leen=data.filter(r=>r.sabe_leer==="Si").length;
  const escriben=data.filter(r=>r.sabe_escribir==="Si").length;
  const pctLee=total?Math.round(leen/total*100):0;
  const pctEscribe=total?Math.round(escriben/total*100):0;
  const pctFirma=total?Math.round(firman/total*100):0;
  const pctAgua=total?Math.round(conAgua/total*100):0;
  const avgDep=total?(data.reduce((s,r)=>s+r.dependientes,0)/total).toFixed(1):0;
  const amasDeCasa=data.filter(r=>r.profesion?.toLowerCase().includes("ama")).length;
  const pctAmas=total?Math.round(amasDeCasa/total*10)/10:0;
  const minEdad=total?Math.min(...data.map(r=>r.edad)):0;
  const maxEdad=total?Math.max(...data.map(r=>r.edad)):0;
  const sumaEdades=data.reduce((s,r)=>s+r.edad,0);

  const paredMap={};data.forEach(r=>{paredMap[r.pared]=(paredMap[r.pared]||0)+1;});
  const paredData=Object.entries(paredMap).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({name:k,cantidad:v}));
  const drenMap={};data.forEach(r=>{drenMap[r.drenaje]=(drenMap[r.drenaje]||0)+1;});
  const drenData=Object.entries(drenMap).map(([k,v])=>({name:k,value:v}));

  const tabs=[
    {id:"resumen",      label:"📊 Resumen"},
    {id:"demografia",   label:"👥 Demografía"},
    {id:"vivienda",     label:"🏚️ Vivienda"},
    {id:"financiero",   label:"💰 Financiero"},
    {id:"materiales",   label:"🧱 Materiales"},
    {id:"mapa",         label:"🗺️ Mapa"},
    {id:"beneficiarios",label:"📋 Beneficiarios"},
  ];
  const filterLabel=useMemo(()=>{
    const parts=[];
    if(anioFilter!=="Todos") parts.push(`Año ${anioFilter}`);
    if(regionFilter!=="Todas") parts.push(`Región ${regionFilter}`);
    if(comunidadFilter!=="Todas") parts.push(comunidadFilter);
    return parts.length ? parts.join(" · ") : "Todos los años y regiones";
  },[anioFilter,regionFilter,comunidadFilter]);

  return (
    <div style={{background:BG,minHeight:"100vh",fontFamily:"'Segoe UI',Helvetica,Arial,sans-serif",color:TEXT}}>
      <div style={{background:SECONDARY,padding:"0 32px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 0",borderBottom:"1px solid rgba(255,255,255,0.1)",flexWrap:"wrap",rowGap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,background:PRIMARY,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🏠</div>
            <div>
              <div style={{fontSize:18,fontWeight:700,color:"#fff",letterSpacing:"-0.02em"}}>Hoga<span style={{color:"#E8A882"}}>RES</span></div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",marginTop:1}}>Unidos por hogares resilientes y saludables</div>
            </div>
          </div>
          <div style={{height:28,width:1,background:"rgba(255,255,255,0.2)",margin:"0 4px"}}/>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",fontWeight:500}}>Dashboard de Avance</div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            {/* ── Filtro Año ── */}
            <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.08)",padding:"5px 8px 5px 12px",borderRadius:20,border:"1px solid rgba(255,255,255,0.15)"}}>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.7)",fontWeight:600,whiteSpace:"nowrap"}}>📅 Año</span>
              <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                {anios.map(a=>(
                  <button key={a} onClick={()=>setAnioFilter(a)} style={{padding:"4px 10px",borderRadius:12,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:anioFilter===a?PRIMARY:"rgba(255,255,255,0.15)",color:"white",transition:"background 0.15s"}}>
                    {a==="Todos"?"Todos":a}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.1)",padding:"5px 12px",borderRadius:20}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:"#6FCF97"}}/>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.8)"}}>{construidos} construidos de {totalCensados}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.08)",padding:"5px 8px 5px 12px",borderRadius:20,border:"1px solid rgba(255,255,255,0.15)"}}>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.7)",fontWeight:600,whiteSpace:"nowrap"}}>📍 Región</span>
              <div style={{display:"flex",gap:3}}>
                {regiones.map(r=>(
                  <button key={r} onClick={()=>setRegionFilter(String(r))} style={{padding:"4px 10px",borderRadius:12,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:regionFilter===String(r)?PRIMARY:"rgba(255,255,255,0.15)",color:"white"}}>
                    {r==="Todas"?"Todas":`R${r}`}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.08)",padding:"5px 8px 5px 12px",borderRadius:20,border:"1px solid rgba(255,255,255,0.15)"}}>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.7)",fontWeight:600,whiteSpace:"nowrap"}}>🏘️ Comunidad</span>
              <select value={comunidadFilter} onChange={e=>setComunidadFilter(e.target.value)} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"white",fontSize:11,fontWeight:600,borderRadius:10,padding:"3px 6px",cursor:"pointer",outline:"none",maxWidth:160}}>
                {comunidades.map(c=><option key={c} value={c} style={{background:SECONDARY,color:"white"}}>{c==="Todas"?"Todas":c}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:2,paddingTop:10}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"9px 18px",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,borderRadius:"8px 8px 0 0",background:tab===t.id?BG:"transparent",color:tab===t.id?SECONDARY:"rgba(255,255,255,0.6)",borderBottom:tab===t.id?`3px solid ${PRIMARY}`:"3px solid transparent"}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Barra de sincronización ── */}
      {loadState === "loading" && (
        <div style={{background:"#EEF2FF",borderBottom:`1px solid #C7D2FE`,padding:"8px 32px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:14,height:14,border:"2px solid #6366F1",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          <span style={{fontSize:12,color:"#4338CA",fontWeight:600}}>Cargando datos desde Google Sheets…</span>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {loadState === "error" && (
        <div style={{background:"#FEF2F2",borderBottom:`1px solid #FECACA`,padding:"8px 32px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:16}}>⚠️</span>
          <span style={{fontSize:12,color:"#991B1B",fontWeight:600}}>No se pudo cargar Google Sheets — mostrando datos de muestra</span>
          <span style={{fontSize:11,color:"#B91C1C",background:"#FEE2E2",padding:"2px 8px",borderRadius:6}}>{loadMsg}</span>
          <button onClick={()=>window.location.reload()} style={{marginLeft:"auto",background:"#EF4444",color:"white",border:"none",padding:"4px 12px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>🔄 Reintentar</button>
        </div>
      )}
      {loadState === "ok" && lastSync && (
        <div style={{background:"#F0FDF4",borderBottom:`1px solid #BBF7D0`,padding:"6px 32px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:12}}>✅</span>
          <span style={{fontSize:11,color:"#166534",fontWeight:600}}>{raw.length.toLocaleString()} registros cargados desde Google Sheets</span>
          <span style={{fontSize:11,color:"#15803D",marginLeft:"auto"}}>Última sincronización: {lastSync.toLocaleTimeString("es-GT")} · se actualiza cada 5 min</span>
        </div>
      )}
      {loadState === "sample" && (
        <div style={{background:"#FFFBEB",borderBottom:`1px solid #FDE68A`,padding:"6px 32px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:12}}>💡</span>
          <span style={{fontSize:11,color:"#92400E",fontWeight:600}}>Modo demo — configura <code style={{background:"#FDE68A",padding:"1px 5px",borderRadius:4}}>SHEETS_CSV_URL</code> para cargar tus datos reales</span>
        </div>
      )}

      {(anioFilter!=="Todos"||regionFilter!=="Todas"||comunidadFilter!=="Todas") && (
        <div style={{background:LIGHT_PRIMARY,borderBottom:`1px solid ${BORDER}`,padding:"8px 32px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:12,color:PRIMARY,fontWeight:600}}>🔍 {filterLabel}</span>
          <span style={{fontSize:12,color:MUTED}}>· {total} beneficiarios</span>
          <button onClick={()=>{setAnioFilter("Todos");setRegionFilter("Todas");setComunidadFilter("Todas");}} style={{marginLeft:"auto",background:"none",border:`1px solid ${PRIMARY}`,color:PRIMARY,padding:"3px 10px",borderRadius:10,fontSize:11,fontWeight:600,cursor:"pointer"}}>✕ Limpiar filtros</button>
        </div>
      )}

      <div style={{padding:"24px 32px"}}>

        {tab==="resumen" && (
          <>
            <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:20,marginBottom:16}}>
              <div style={{background:CARD,borderRadius:16,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 2px 8px rgba(0,0,0,0.07)",display:"flex",flexDirection:"column",alignItems:"center"}}>
                <div style={{fontSize:12,fontWeight:700,color:SECONDARY,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>🏠 HogaroMETRO</div>
                <Hogometro pct={pctAvance} construidos={construidos} censados={totalCensados}/>
                <div style={{display:"flex",gap:10,marginTop:8,flexWrap:"wrap",justifyContent:"center"}}>
                  {[{label:"Construido",color:SECONDARY},{label:"En Construcción",color:PRIMARY},{label:"En Aprobación",color:ACCENT3}].map((s,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:"50%",background:s.color}}/><span style={{fontSize:9,color:MUTED}}>{s.label}</span></div>
                  ))}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                <KPICard title="Hogares Censados" value={totalCensados} sub="Total en base de datos" icon="📋" accent={MUTED}/>
                <KPICard title="Construidos" value={construidos} sub={`${pctAvance}% del total`} icon="✅" accent={SECONDARY}/>
                <KPICard title="En Construcción" value={enConstruccion||"—"} sub="Obras activas" icon="🔨" accent={PRIMARY}/>
                <KPICard title="Personas Beneficiadas" value={personas.toLocaleString()} sub="Beneficiario + dependientes" icon="👥" accent={SECONDARY}/>
                <KPICard title="M² de Piso Sustituido" value={`${totalM2.toLocaleString()} m²`} sub="Tierra eliminada definitivamente" icon="📐" accent={PRIMARY}/>
                <KPICard title="Inversión Ejecutada" value={`Q${totalInv.toLocaleString()}`} sub={`$${Math.round(totalInv/7.73).toLocaleString()} USD`} icon="💰" accent={SECONDARY}/>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>
              <div style={{background:CARD,borderRadius:12,padding:20,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Hogares por Status</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:14}}>Cada 🏠 representa un hogar</div>
                <WaffleChart data={waffleData} total={Math.max(totalCensados,30)}/>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>
                  {waffleData.filter(d=>d.count>0).map((d,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:5,background:BG,padding:"3px 8px",borderRadius:20}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:d.color}}/><span style={{fontSize:10,color:TEXT,fontWeight:600}}>{d.count} {d.status}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{background:CARD,borderRadius:12,padding:20,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Distribución de Inversión</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:14}}>Proporcional al monto en quetzales</div>
                <ResponsiveContainer width="100%" height={190}>
                  <Treemap data={treemapData} dataKey="value" nameKey="name" aspectRatio={1} content={({x,y,width,height,name,value,index})=><TreemapContent x={x} y={y} width={width} height={height} name={name} value={value} color={[SECONDARY,PRIMARY,ACCENT3][index%3]}/>}>
                    <Tooltip formatter={v=>`Q${v.toLocaleString()}`} contentStyle={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:8}}/>
                  </Treemap>
                </ResponsiveContainer>
                <div style={{display:"flex",gap:10,marginTop:10,justifyContent:"center"}}>
                  {treemapData.map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:2,background:d.color}}/><span style={{fontSize:10,color:MUTED}}>{d.name}</span></div>)}
                </div>
              </div>
              <div style={{background:CARD,borderRadius:12,padding:20,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Avance por Región</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:18}}>% de hogares construidos</div>
                <RegionProgress regiones={regionesData}/>
                {regionesData.length===1&&<div style={{marginTop:12,background:LIGHT_PRIMARY,borderRadius:8,padding:"8px 12px",fontSize:11,color:PRIMARY}}>💡 Al agregar las Regiones 2, 3 y 4 aparecerán aquí automáticamente.</div>}
              </div>
            </div>

            {(()=>{
              const costoPorPersona=personas?Math.round(totalInv/personas):0;
              const ninos=Math.round(personas*0.38);
              const co2=(construidos*0.5).toFixed(1);
              const cards=[
                {icon:"💸",color:PRIMARY,label:"Costo por persona beneficiada",value:`Q${costoPorPersona.toLocaleString()}`,desc:`Por Q${costoPorPersona.toLocaleString()} (~$${Math.round(costoPorPersona/7.73)} USD) una persona tiene piso digno para toda la vida.`,tag:"Eficiencia del programa"},
                {icon:"🧒",color:SECONDARY,label:"Niños protegidos esta noche",value:`~${ninos.toLocaleString()}`,desc:`El 38% de los miembros del hogar son menores de 18 años (INE Guatemala). ${ninos} niños duermen esta noche sobre piso seguro.`,tag:"Impacto en infancia"},
                {icon:"🌍",color:ACCENT4,label:"Emisiones CO₂ evitadas",value:`${co2} ton/año`,desc:`El piso de tierra húmedo genera ~0.5 ton CO₂ por hogar al año. ${construidos} hogares construidos evitan ${co2} toneladas anuales.`,tag:"Impacto ambiental (BID)"},
              ];
              return (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Historias de Impacto</div>
                  <div style={{fontSize:11,color:MUTED,marginBottom:12}}>{filterLabel}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
                    {cards.map((c,i)=>(
                      <div key={i} style={{background:CARD,borderRadius:12,padding:"20px",border:`1px solid ${BORDER}`,borderTop:`4px solid ${c.color}`,position:"relative",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                        <div style={{position:"absolute",right:-8,bottom:-8,fontSize:64,opacity:0.05}}>{c.icon}</div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><span style={{fontSize:22}}>{c.icon}</span><span style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:"white",background:c.color,padding:"2px 8px",borderRadius:10}}>{c.tag}</span></div>
                        <div style={{fontSize:30,fontWeight:800,color:c.color,lineHeight:1,marginBottom:6}}>{c.value}</div>
                        <div style={{fontSize:11,color:TEXT,fontWeight:600,marginBottom:6}}>{c.label}</div>
                        <div style={{fontSize:11,color:MUTED,lineHeight:1.6}}>{c.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── Comparativo por Año ── */}
            {añosData.length > 0 && (
              <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:2,flexWrap:"wrap"}}>
                  <div style={{fontSize:13,fontWeight:700,color:SECONDARY}}>📅 Avance por Año</div>
                  {anioFilter!=="Todos"&&<span style={{fontSize:11,background:`${PRIMARY}18`,color:PRIMARY,padding:"2px 8px",borderRadius:10,fontWeight:700}}>Viendo: {anioFilter}</span>}
                </div>
                <div style={{fontSize:11,color:MUTED,marginBottom:18}}>Hogares censados, construidos e inversión acumulada por año del programa</div>
                <div style={{display:"grid",gridTemplateColumns:`repeat(${añosData.length},1fr)`,gap:12}}>
                  {añosData.map((a,i)=>{
                    const pct=a.total?Math.round(a.construidos/a.total*100):0;
                    const isActive=anioFilter===a.anio;
                    return(
                      <div key={i} onClick={()=>setAnioFilter(isActive?"Todos":a.anio)}
                        style={{borderRadius:10,padding:"16px 18px",border:`2px solid ${isActive?PRIMARY:BORDER}`,background:isActive?LIGHT_PRIMARY:BG,cursor:"pointer",transition:"all 0.15s"}}>
                        <div style={{fontSize:18,fontWeight:800,color:isActive?PRIMARY:SECONDARY,marginBottom:2}}>{a.anio}</div>
                        <div style={{fontSize:11,color:MUTED,marginBottom:10}}>Año del programa</div>
                        {/* Barra de avance */}
                        <div style={{background:"#E5E0DB",borderRadius:20,height:8,marginBottom:10}}>
                          <div style={{width:`${pct}%`,height:8,borderRadius:20,background:isActive?PRIMARY:SECONDARY,transition:"width 0.4s"}}/>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                          <div style={{textAlign:"center",background:CARD,borderRadius:8,padding:"8px 4px"}}>
                            <div style={{fontSize:20,fontWeight:800,color:SECONDARY,lineHeight:1}}>{a.total.toLocaleString()}</div>
                            <div style={{fontSize:9,color:MUTED,fontWeight:600,marginTop:2}}>CENSADOS</div>
                          </div>
                          <div style={{textAlign:"center",background:CARD,borderRadius:8,padding:"8px 4px"}}>
                            <div style={{fontSize:20,fontWeight:800,color:isActive?PRIMARY:SECONDARY,lineHeight:1}}>{a.construidos.toLocaleString()}</div>
                            <div style={{fontSize:9,color:MUTED,fontWeight:600,marginTop:2}}>CONSTRUIDOS</div>
                          </div>
                        </div>
                        <div style={{marginTop:8,textAlign:"center"}}>
                          <div style={{fontSize:16,fontWeight:800,color:isActive?PRIMARY:TEXT}}>Q{(a.inversion/1000).toFixed(0)}K</div>
                          <div style={{fontSize:9,color:MUTED,fontWeight:600}}>INVERSIÓN TOTAL</div>
                        </div>
                        <div style={{marginTop:8,background:isActive?`${PRIMARY}22`:"rgba(0,0,0,0.04)",borderRadius:8,padding:"4px 0",textAlign:"center"}}>
                          <span style={{fontSize:13,fontWeight:800,color:isActive?PRIMARY:SECONDARY}}>{pct}%</span>
                          <span style={{fontSize:10,color:MUTED,marginLeft:4}}>construido</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {añosData.length>1&&(
                  <div style={{marginTop:16,padding:"10px 14px",background:BG,borderRadius:8,fontSize:11,color:MUTED,display:"flex",gap:20,flexWrap:"wrap"}}>
                    <span>🏗️ Total programa: <b style={{color:TEXT}}>{raw.length.toLocaleString()} hogares censados</b></span>
                    <span>✅ <b style={{color:SECONDARY}}>{raw.filter(r=>r.status==="Construido").length.toLocaleString()} construidos</b> en todos los años</span>
                    <span>💰 Inversión total: <b style={{color:TEXT}}>Q{raw.reduce((s,r)=>s+(r.inversion_total||0),0).toLocaleString()}</b></span>
                    {anioFilter==="Todos"&&<span style={{marginLeft:"auto",color:PRIMARY,fontWeight:600,cursor:"pointer"}} onClick={()=>{}}>👆 Clic en un año para filtrar todo el dashboard</span>}
                  </div>
                )}
              </div>
            )}

            {(()=>{
              const CANCHA_M2=7140,pctCancha=((totalM2/CANCHA_M2)*100).toFixed(1),hogaresPorCancha=Math.round(CANCHA_M2/36);
              return (
                <div style={{background:`linear-gradient(135deg,${SECONDARY} 0%,#3d6b32 100%)`,borderRadius:12,padding:"24px 28px",position:"relative",overflow:"hidden",marginBottom:8}}>
                  <div style={{position:"absolute",right:-20,top:"50%",transform:"translateY(-50%)",fontSize:160,opacity:0.07}}>🏟️</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:32,alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.6)",marginBottom:8}}>⚽ Dato Curioso</div>
                      <div style={{fontSize:15,fontWeight:700,color:"white",lineHeight:1.6}}>El área de piso sustituida equivale al{" "}<span style={{color:"#E8A882",fontSize:36,fontWeight:800}}>{pctCancha}%</span>{" "}de la cancha del Estadio Cementos Progreso</div>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginBottom:16,lineHeight:1.6}}>La cancha tiene <b style={{color:"rgba(255,255,255,0.9)"}}>7,140 m²</b> (reglamento FIFA). Una cancha completa equivale a <b style={{color:"rgba(255,255,255,0.9)"}}>{hogaresPorCancha} hogares</b> — una cancha entera de piso digno.</div>
                      <div style={{background:"rgba(255,255,255,0.15)",borderRadius:20,height:12,width:"100%",marginBottom:8}}>
                        <div style={{width:`${Math.min(pctCancha,100)}%`,height:12,borderRadius:20,background:"linear-gradient(90deg,#E8A882,#BC5A3A)"}}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,0.5)"}}>
                        <span>0 m²</span><span style={{color:"rgba(255,255,255,0.9)",fontWeight:700}}>{totalM2.toLocaleString()} m² sustituidos</span><span>7,140 m²</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {tab==="demografia" && (
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:20}}>
              <KPICard title="Edad Promedio" value={`${avgEdad} años`} sub={`Rango: ${minEdad}–${maxEdad} años`} icon="📅" accent={PRIMARY}/>
              <KPICard title="Dependientes/Familia" value={avgDep} sub="Promedio por hogar" icon="👨‍👩‍👧" accent={SECONDARY}/>
              <KPICard title="Ingreso Promedio" value={`Q${avgIng.toLocaleString()}`} sub="Mensual por familia" icon="💵" accent={PRIMARY}/>
              <KPICard title="Saben Leer y Escribir" value={`${pctLee}%`} sub={`${saben} de ${total}`} icon="📖" accent={SECONDARY}/>
              <KPICard title="Pueden Firmar" value={`${pctFirma}%`} sub={`${firman} de ${total}`} icon="✍️" accent={PRIMARY}/>
              <KPICard title="Acceso Agua Potable" value={`${pctAgua}%`} sub={`${conAgua} de ${total}`} icon="💧" accent={SECONDARY}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:16,marginBottom:16}}>
              <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Distribución de Edades por Beneficiario</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:16}}>Cada punto es un beneficiario, coloreado por estado civil · pasa el cursor para ver detalles</div>
                <BeeswarmEdades data={data}/>
              </div>
              <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Indicadores de Alfabetismo</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:20}}>% de beneficiarios que dominan cada habilidad</div>
                <GaugeTriple items={[
                  {label:"Saben leer",pct:pctLee,count:leen,total,color:SECONDARY},
                  {label:"Saben escribir",pct:pctEscribe,count:escriben,total,color:PRIMARY},
                  {label:"Saben firmar",pct:pctFirma,count:firman,total,color:ACCENT4},
                ]}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:16,marginBottom:16}}>
              <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Pirámide Ingreso vs Egreso por Edad</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:20}}>Promedio mensual en quetzales por grupo etario · balance al final</div>
                <PiramideIngresos data={data}/>
              </div>
              <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Ocupación y Estado Civil</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:8}}>Interior: estado civil · Exterior: ocupación</div>
                <DonutAnidado data={data}/>
              </div>
            </div>
            <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)",marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Vulnerabilidad: Material de Pared × Acceso a Agua</div>
              <div style={{fontSize:11,color:MUTED,marginBottom:20}}>Cruce entre condición de la vivienda y acceso a servicios básicos</div>
              <HeatmapParedAgua data={data}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={{background:`linear-gradient(135deg,${PRIMARY} 0%,#d4845f 100%)`,borderRadius:12,padding:24,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",right:-10,bottom:-10,fontSize:100,opacity:0.08}}>💼</div>
                <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.6)",marginBottom:8}}>💼 Trabajo no remunerado</div>
                <div style={{fontSize:15,fontWeight:700,color:"white",lineHeight:1.6,marginBottom:12}}>
                  <span style={{fontSize:40,fontWeight:800,color:"#ffe0d0",display:"block",lineHeight:1}}>{pctAmas} de cada 10</span>
                  beneficiarios son amas de casa — un trabajo invisible que el programa reconoce con dignidad.
                </div>
                <div style={{background:"rgba(255,255,255,0.15)",borderRadius:8,padding:"10px 14px",fontSize:11,color:"rgba(255,255,255,0.85)",lineHeight:1.6}}>
                  {amasDeCasa} de {total} titulares del hogar ejercen trabajo doméstico no remunerado. HogaRES prioriza a quienes más lo necesitan.
                </div>
              </div>
              <div style={{background:`linear-gradient(135deg,${SECONDARY} 0%,#3d6b32 100%)`,borderRadius:12,padding:24,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",right:-10,bottom:-10,fontSize:100,opacity:0.08}}>⏳</div>
                <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.6)",marginBottom:8}}>📅 Brecha generacional</div>
                <div style={{fontSize:15,fontWeight:700,color:"white",lineHeight:1.6,marginBottom:12}}>
                  Entre el beneficiario más joven ({minEdad} años) y el mayor ({maxEdad} años) hay{" "}
                  <span style={{fontSize:40,fontWeight:800,color:"#c8e6c0",display:"block",lineHeight:1}}>{maxEdad-minEdad} años</span>
                  de diferencia — todos merecen piso digno.
                </div>
                <div style={{background:"rgba(255,255,255,0.15)",borderRadius:8,padding:"10px 14px",fontSize:11,color:"rgba(255,255,255,0.85)",lineHeight:1.6}}>
                  Juntos suman <b>{sumaEdades.toLocaleString()} años</b> de vida sobre piso de tierra. HogaRES llega a todas las generaciones.
                </div>
              </div>
            </div>
          </>
        )}

        {tab==="vivienda" && (()=>{
          // ── computed ──
          const sinAgua = total - conAgua;
          const pctSinAgua = total ? Math.round(sinAgua/total*100) : 0;
          const pctConAgua = total ? Math.round(conAgua/total*100) : 0;

          // Drenaje seguro vs inseguro
          const drenajeSeguro = data.filter(r=>r.drenaje==="Fosa septica"||r.drenaje==="Letrina Ventilada").length;
          const drenajeInseguro = data.filter(r=>r.drenaje==="Pozo ciego").length;
          const pctDrenajeInseguro = total ? Math.round(drenajeInseguro/total*100) : 0;

          // Pared vulnerable = todo lo que NO es Block, Block lamina, Madera, Lamina madera
          const PARED_SOLIDA = (p="")=>p==="Block"||p==="Block lamina"||p==="Madera"||p==="Lamina madera";
          const parVulnerable = data.filter(r=>!PARED_SOLIDA(r.pared)).length;
          const parSolida = data.filter(r=>PARED_SOLIDA(r.pared)).length;
          const pctVulnerable = total ? Math.round(parVulnerable/total*100) : 0;

          // Índice de vulnerabilidad compuesto
          const vulnScore = data.map(r=>{
            let s=0;
            if(r.agua==="No") s++;
            if(r.drenaje==="Pozo ciego") s++;
            if(!PARED_SOLIDA(r.pared)) s++;
            return s;
          });
          const altaVuln = vulnScore.filter(s=>s===3).length;
          const mediaVuln = vulnScore.filter(s=>s===2).length;
          const bajaVuln = vulnScore.filter(s=>s<=1).length;

          // Tabla de condición por hogar
          const condicionData = [
            {label:"Pared resistente",count:parSolida,pct:total?Math.round(parSolida/total*100):0,color:SECONDARY,icon:"🧱"},
            {label:"Pared vulnerable",count:parVulnerable,pct:pctVulnerable,color:PRIMARY,icon:"⚠️"},
            {label:"Con agua potable",count:conAgua,pct:pctConAgua,color:ACCENT4,icon:"💧"},
            {label:"Sin agua potable",count:sinAgua,pct:pctSinAgua,color:PRIMARY,icon:"🚱"},
            {label:"Pozo ciego",count:drenajeInseguro,pct:pctDrenajeInseguro,color:"#E07B39",icon:"🪣"},
            {label:"Saneamiento mejorado",count:drenajeSeguro,pct:total?Math.round(drenajeSeguro/total*100):0,color:SECONDARY,icon:"✅"},
          ];

          return <>
            {/* ── KPIs de vivienda ── */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
              <KPICard title="Viviendas Propias" value={`${total}`} sub="100% son titulares" icon="🏡" accent={SECONDARY}/>
              <KPICard title="Con Agua Potable" value={`${pctConAgua}%`} sub={`${conAgua} de ${total} hogares`} icon="💧" accent={ACCENT4}/>
              <KPICard title="Saneamiento por Pozo Ciego" value={`${pctDrenajeInseguro}%`} sub={`${drenajeInseguro} hogares`} icon="🪣" accent={PRIMARY}/>
              <KPICard title="Pared Vulnerable" value={`${pctVulnerable}%`} sub={`Lámina, adobe u otros materiales`} icon="🏚️" accent="#E07B39"/>
            </div>

            {/* ── Fila 1: Pared stacked + Agua split ── */}
            <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:16,marginBottom:16}}>

              {/* Pared - barra simple */}
              <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Material de Pared</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:18}}>Tipo de material predominante por cantidad de hogares</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={paredData} layout="vertical" margin={{left:90,right:30}}>
                    <XAxis type="number" tick={{fill:MUTED,fontSize:10}} allowDecimals={false}/>
                    <YAxis dataKey="name" type="category" tick={{fill:TEXT,fontSize:10}} width={85}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Bar dataKey="cantidad" name="Hogares" radius={[0,6,6,0]}>
                      {paredData.map((e,i)=>{
                        const isVuln=!PARED_SOLIDA(e.name);
                        return <Cell key={i} fill={isVuln?PRIMARY:SECONDARY}/>;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:2,background:SECONDARY}}/><span style={{fontSize:10,color:MUTED}}>Material resistente</span></div>
                  <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:2,background:PRIMARY}}/><span style={{fontSize:10,color:MUTED}}>Material vulnerable</span></div>
                </div>
              </div>

              {/* Acceso al agua - visual grande */}
              <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Acceso a Agua Potable</div>
                  <div style={{fontSize:11,color:MUTED,marginBottom:20}}>Disponibilidad por hogar beneficiado</div>
                </div>
                {/* Split visual */}
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:12,justifyContent:"center"}}>
                  {[
                    {label:"Con acceso",val:conAgua,pct:pctConAgua,color:ACCENT4,icon:"💧",bg:"rgba(74,122,64,0.08)"},
                    {label:"Sin acceso",val:sinAgua,pct:pctSinAgua,color:PRIMARY,icon:"🚱",bg:"rgba(188,90,58,0.08)"},
                  ].map((item,i)=>(
                    <div key={i} style={{background:item.bg,borderRadius:10,padding:"14px 16px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:20}}>{item.icon}</span>
                          <span style={{fontSize:12,fontWeight:700,color:item.color}}>{item.label}</span>
                        </div>
                        <span style={{fontSize:26,fontWeight:800,color:item.color}}>{item.pct}%</span>
                      </div>
                      <div style={{background:"rgba(0,0,0,0.08)",borderRadius:20,height:8}}>
                        <div style={{width:`${item.pct}%`,height:8,borderRadius:20,background:item.color}}/>
                      </div>
                      <div style={{fontSize:10,color:MUTED,marginTop:5}}>{item.val} hogares</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Fila 2: Donut drenaje + Índice vulnerabilidad + Condición tabla ── */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>

              {/* Donut drenaje mejorado */}
              <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Sistema de Drenaje</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:8}}>Tipo de saneamiento por hogar</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={drenData} dataKey="value" nameKey="name" cx="50%" cy="48%" innerRadius={48} outerRadius={78}
                      label={({name,percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {drenData.map((e,i)=><Cell key={i} fill={[PRIMARY,SECONDARY,ACCENT3,ACCENT4,"#94a3b8"][i%5]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,fontSize:11}}/>
                    <Legend formatter={v=><span style={{fontSize:10,color:TEXT}}>{v}</span>} wrapperStyle={{fontSize:10}}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Índice de vulnerabilidad compuesto */}
              <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Índice de Vulnerabilidad</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:20}}>Combinación: pared · agua · drenaje (3 factores)</div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {[
                    {label:"Alta vulnerabilidad",desc:"3 factores de riesgo",count:altaVuln,color:PRIMARY,icon:"🔴"},
                    {label:"Vulnerabilidad media",desc:"2 factores de riesgo",count:mediaVuln,color:ACCENT3,icon:"🟡"},
                    {label:"Vulnerabilidad baja",desc:"0–1 factor de riesgo",count:bajaVuln,color:SECONDARY,icon:"🟢"},
                  ].map((item,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:16,flexShrink:0}}>{item.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <div>
                            <span style={{fontSize:11,fontWeight:700,color:TEXT}}>{item.label}</span>
                            <span style={{fontSize:10,color:MUTED,marginLeft:6}}>{item.desc}</span>
                          </div>
                          <span style={{fontSize:13,fontWeight:800,color:item.color}}>{item.count}</span>
                        </div>
                        <div style={{background:"#E5E0DB",borderRadius:20,height:7}}>
                          <div style={{width:`${total?item.count/total*100:0}%`,height:7,borderRadius:20,background:item.color}}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:18,background:LIGHT_PRIMARY,borderRadius:8,padding:"10px 12px",fontSize:11,color:PRIMARY,lineHeight:1.6}}>
                  💡 <b>{altaVuln} hogares</b> concentran los 3 factores de riesgo simultáneamente (pared, agua y saneamiento) — son prioridad máxima de intervención.
                </div>
              </div>

              {/* Tabla de condición */}
              <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Resumen de Condiciones</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:16}}>Panorama integral por indicador</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {condicionData.map((c,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:14,width:20,textAlign:"center",flexShrink:0}}>{c.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                          <span style={{fontSize:10,color:TEXT,fontWeight:600}}>{c.label}</span>
                          <span style={{fontSize:11,fontWeight:800,color:c.color}}>{c.pct}%</span>
                        </div>
                        <div style={{background:"#E5E0DB",borderRadius:20,height:5}}>
                          <div style={{width:`${c.pct}%`,height:5,borderRadius:20,background:c.color}}/>
                        </div>
                      </div>
                      <span style={{fontSize:10,color:MUTED,width:22,textAlign:"right",flexShrink:0}}>{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Fila 3: Storytellings ── */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>

              {/* Pozo ciego */}
              <div style={{background:`linear-gradient(135deg,${PRIMARY} 0%,#a04830 100%)`,borderRadius:12,padding:24,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",right:-10,bottom:-10,fontSize:100,opacity:0.07}}>🚽</div>
                <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.6)",marginBottom:8}}>🪣 Saneamiento básico</div>
                <div style={{fontSize:15,fontWeight:700,color:"white",lineHeight:1.6,marginBottom:12}}>
                  <span style={{fontSize:40,fontWeight:800,color:"#ffe0d0",display:"block",lineHeight:1}}>{pctDrenajeInseguro}%</span>
                  de los hogares utiliza pozo ciego — el sistema más extendido en el área rural pero con limitaciones importantes para la salud.
                </div>
                <div style={{background:"rgba(255,255,255,0.15)",borderRadius:8,padding:"10px 14px",fontSize:11,color:"rgba(255,255,255,0.85)",lineHeight:1.6}}>
                  Según la OPS, el pozo ciego sin impermeabilización puede contaminar fuentes de agua subterránea hasta en un radio de <b>30 metros</b>. HogaRES reduce este riesgo con infraestructura sanitaria mejorada.
                </div>
              </div>

              {/* Lámina y clima */}
              <div style={{background:`linear-gradient(135deg,${SECONDARY} 0%,#1e3018 100%)`,borderRadius:12,padding:24,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",right:-10,bottom:-10,fontSize:100,opacity:0.07}}>🌧️</div>
                <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.6)",marginBottom:8}}>🏚️ Resiliencia climática</div>
                <div style={{fontSize:15,fontWeight:700,color:"white",lineHeight:1.6,marginBottom:12}}>
                  <span style={{fontSize:40,fontWeight:800,color:"#c8e6c0",display:"block",lineHeight:1}}>{pctVulnerable}%</span>
                  tiene paredes de lámina, madera o adobe — materiales altamente vulnerables a lluvias, viento y fríos del altiplano.
                </div>
                <div style={{background:"rgba(255,255,255,0.15)",borderRadius:8,padding:"10px 14px",fontSize:11,color:"rgba(255,255,255,0.85)",lineHeight:1.6}}>
                  San Juan Sacatepéquez registra temporadas con hasta <b>3,000 mm/año</b> de lluvia. Las paredes de lámina tienen una vida útil de solo <b>8–12 años</b> bajo esas condiciones. HogaRES prioriza materiales duraderos.
                </div>
              </div>
            </div>

            {/* ── Banner: Vivienda propia ── */}
            <div style={{background:`linear-gradient(135deg,#4A7A40 0%,#2C4324 100%)`,borderRadius:12,padding:"22px 28px",display:"flex",alignItems:"center",gap:32,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:-20,top:"50%",transform:"translateY(-50%)",fontSize:140,opacity:0.06}}>🏡</div>
              <div style={{fontSize:56,fontWeight:800,color:"#E8A882",lineHeight:1,flexShrink:0}}>100%</div>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:"white",marginBottom:6}}>Todas las familias son titulares de su vivienda</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",lineHeight:1.7,maxWidth:600}}>
                  El 100% de los beneficiarios del programa HogaRES son propietarios de su terreno o vivienda, lo que garantiza que la inversión en piso firme tiene un impacto permanente y no desplazable. Esto también facilita el acceso a créditos y mejoras futuras sobre el inmueble.
                </div>
              </div>
              <div style={{marginLeft:"auto",flexShrink:0,display:"flex",flexDirection:"column",gap:8}}>
                {[{icon:"✅",label:`${total} familias propietarias`},{icon:"📜",label:"Inversión sobre activo propio"},{icon:"🔒",label:"Impacto permanente y seguro"}].map((item,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.1)",padding:"6px 12px",borderRadius:20}}>
                    <span style={{fontSize:13}}>{item.icon}</span>
                    <span style={{fontSize:11,color:"rgba(255,255,255,0.85)",fontWeight:600}}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>;
        })()}

        {tab==="financiero" && (()=>{
          const TC = 7.73; // tipo de cambio GTQ → USD
          const totalHog  = data.reduce((s,r)=>s+(r.inversion_hogares||0),0);
          const totalLic  = data.reduce((s,r)=>s+(r.inversion_licencia||0),0);
          const totalCont = data.reduce((s,r)=>s+(r.contrapartida||0),0);
          const totalProg = totalHog + totalLic; // inversión programa
          const grandTotal = totalProg + totalCont;
          const n = data.length || 1;
          const avgHog  = Math.round(totalHog/n);
          const avgLic  = Math.round(totalLic/n);
          const avgCont = Math.round(totalCont/n);
          const avgTotal= Math.round(grandTotal/n);

          const pctHog  = Math.round(totalHog/grandTotal*100);
          const pctLic  = Math.round(totalLic/grandTotal*100);
          const pctCont = Math.round(totalCont/grandTotal*100);

          const triData = [
            {name:"Programa HogaRES", value:totalHog,  pct:pctHog,  color:SECONDARY, avg:avgHog,  icon:"🏠"},
            {name:"Licencia Social",   value:totalLic,  pct:pctLic,  color:PRIMARY,   avg:avgLic,  icon:"📋"},
            {name:"Contrapartida",     value:totalCont, pct:pctCont, color:ACCENT3,   avg:avgCont, icon:"🤝"},
          ];

          // Barra acumulada por hogar (uno por hogar — todos son iguales en este set)
          const barData = [{
            name:"Por hogar",
            "Prog. HogaRES": avgHog,
            "Lic. Social":   avgLic,
            "Contrapartida": avgCont,
          }];

          // Simulación: ¿cuántos hogares más se pueden construir con X presupuesto?
          const escala = [10,25,50,100,200];
          const escalaData = escala.map(h=>({
            hogares:`${h} hogares`,
            total: h*avgTotal,
            totalUSD: Math.round(h*avgTotal/TC),
          }));

          // Acumulado de inversión en el tiempo (simulado por código — orden de beneficiarios)
          const acumData = data.map((r,i)=>({
            idx:`R${String(i+1).padStart(2,"0")}`,
            acum: (i+1)*avgTotal,
            acumUSD: Math.round((i+1)*avgTotal/TC),
          }));

          const fmt  = v => `Q${Number(v).toLocaleString()}`;
          const fmtU = v => `$${Number(Math.round(v/TC)).toLocaleString()}`;

          return <>
            {/* ── KPIs ── */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
              <KPICard title="Inversión Total del Programa" value={fmt(grandTotal)} sub={`${fmtU(grandTotal)} USD · ${n} hogares`} icon="💰" accent={SECONDARY}/>
              <KPICard title="Aporte HogaRES" value={fmt(totalHog)} sub={`${fmtU(totalHog)} USD · ${pctHog}% del total`} icon="🏠" accent={SECONDARY}/>
              <KPICard title="Aporte Lic. Social" value={fmt(totalLic)} sub={`${fmtU(totalLic)} USD · ${pctLic}% del total`} icon="📋" accent={PRIMARY}/>
              <KPICard title="Contrapartida Familias" value={fmt(totalCont)} sub={`${fmtU(totalCont)} USD · ${pctCont}% del total`} icon="🤝" accent={ACCENT3}/>
            </div>

            {/* ── Fila 1: Donut tripartito + Barras apiladas horizontales ── */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>

              {/* Donut tripartito */}
              <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Estructura Tripartita de Financiamiento</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:8}}>Participación porcentual de cada actor en el costo total</div>
                <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                  <div style={{flex:"0 0 200px"}}>
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie data={triData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                          innerRadius={52} outerRadius={85} startAngle={90} endAngle={-270}>
                          {triData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                        </Pie>
                        <Tooltip formatter={v=>[fmt(v),"Monto"]} contentStyle={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,fontSize:11}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:14,paddingTop:16}}>
                    {triData.map((d,i)=>(
                      <div key={i}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                          <div style={{display:"flex",alignItems:"center",gap:7}}>
                            <div style={{width:11,height:11,borderRadius:3,background:d.color,flexShrink:0}}/>
                            <span style={{fontSize:11,fontWeight:700,color:TEXT}}>{d.name}</span>
                          </div>
                          <span style={{fontSize:15,fontWeight:800,color:d.color}}>{d.pct}%</span>
                        </div>
                        <div style={{background:"#E5E0DB",borderRadius:20,height:6}}>
                          <div style={{width:`${d.pct}%`,height:6,borderRadius:20,background:d.color}}/>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                          <span style={{fontSize:10,color:MUTED}}>{fmt(d.value)}</span>
                          <span style={{fontSize:10,color:MUTED}}>{fmtU(d.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Costo por hogar desglosado */}
              <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Costo por Hogar — Desglose Tripartito</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:20}}>Monto en quetzales que aporta cada actor por cada vivienda</div>

                {/* Barra apilada visual manual */}
                <div style={{marginBottom:20}}>
                  <div style={{display:"flex",height:44,borderRadius:10,overflow:"hidden",marginBottom:10}}>
                    {triData.map((d,i)=>(
                      <div key={i} style={{width:`${d.pct}%`,background:d.color,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",position:"relative"}}>
                        {d.pct>12&&<>
                          <span style={{fontSize:10,fontWeight:800,color:"white"}}>{d.pct}%</span>
                          <span style={{fontSize:9,color:"rgba(255,255,255,0.8)"}}>Q{d.avg.toLocaleString()}</span>
                        </>}
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                    {triData.map((d,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
                        <div style={{width:8,height:8,borderRadius:2,background:d.color}}/>
                        <span style={{fontSize:10,color:MUTED}}>{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cards individuales */}
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {triData.map((d,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:BG,border:`1px solid ${BORDER}`}}>
                      <span style={{fontSize:18,flexShrink:0}}>{d.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11,color:MUTED,fontWeight:600}}>{d.name}</div>
                        <div style={{fontSize:14,fontWeight:800,color:d.color}}>{fmt(d.avg)} <span style={{fontSize:10,color:MUTED,fontWeight:500}}>/ hogar</span></div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:11,fontWeight:700,color:MUTED}}>${Math.round(d.avg/TC).toLocaleString()}</div>
                        <div style={{fontSize:9,color:MUTED}}>USD</div>
                      </div>
                    </div>
                  ))}
                  <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:LIGHT_SECONDARY,border:`2px solid ${SECONDARY}`}}>
                    <span style={{fontSize:18}}>🏡</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,color:SECONDARY,fontWeight:700}}>TOTAL por hogar</div>
                      <div style={{fontSize:16,fontWeight:800,color:SECONDARY}}>{fmt(avgTotal)}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:13,fontWeight:800,color:SECONDARY}}>${Math.round(avgTotal/TC).toLocaleString()}</div>
                      <div style={{fontSize:9,color:MUTED}}>USD</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Fila 2: Inversión acumulada + Escala de impacto ── */}
            <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:16,marginBottom:16}}>

              {/* Línea acumulada */}
              <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Inversión Acumulada por Hogar Construido</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:18}}>Crecimiento del compromiso financiero conforme avanza el programa</div>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={acumData} margin={{left:10,right:10}}>
                    <defs>
                      <linearGradient id="acum-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SECONDARY} stopOpacity={0.9}/>
                        <stop offset="100%" stopColor={SECONDARY} stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="idx" tick={{fill:MUTED,fontSize:9}} interval={4}/>
                    <YAxis tick={{fill:MUTED,fontSize:10}} tickFormatter={v=>`Q${(v/1000).toFixed(0)}k`}/>
                    <Tooltip
                      formatter={(v,n)=>[`Q${Number(v).toLocaleString()} ($${Math.round(v/TC).toLocaleString()} USD)`,n]}
                      contentStyle={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,fontSize:11}}
                    />
                    <Bar dataKey="acum" name="Inversión acumulada" fill="url(#acum-grad)" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Escala de impacto */}
              <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Escala de Inversión</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:16}}>¿Cuánto costaría ampliar el programa?</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {escalaData.map((e,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,background:i===0?LIGHT_SECONDARY:BG,border:`1px solid ${i===0?SECONDARY:BORDER}`}}>
                      <span style={{fontSize:14,flexShrink:0}}>🏠</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11,fontWeight:700,color:i===0?SECONDARY:TEXT}}>{e.hogares}</div>
                        <div style={{fontSize:10,color:MUTED}}>Q{e.total.toLocaleString()}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:12,fontWeight:800,color:i===0?SECONDARY:MUTED}}>${e.totalUSD.toLocaleString()}</div>
                        <div style={{fontSize:9,color:MUTED}}>USD</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12,padding:"8px 12px",background:LIGHT_PRIMARY,borderRadius:8,fontSize:10,color:PRIMARY,lineHeight:1.6}}>
                  💱 Tipo de cambio referencial: <b>Q{TC} = $1 USD</b>
                </div>
              </div>
            </div>

            {/* ── Storytellings ── */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>

              {/* Contrapartida = compromiso real */}
              <div style={{background:`linear-gradient(135deg,${ACCENT3} 0%,#b8653a 100%)`,borderRadius:12,padding:24,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",right:-10,bottom:-10,fontSize:100,opacity:0.08}}>🤝</div>
                <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.6)",marginBottom:8}}>🤝 Compromiso comunitario</div>
                <div style={{fontSize:15,fontWeight:700,color:"white",lineHeight:1.6,marginBottom:12}}>
                  <span style={{fontSize:40,fontWeight:800,color:"#fff3ed",display:"block",lineHeight:1}}>Q{avgCont.toLocaleString()}</span>
                  aporta cada familia como contrapartida — equivalente a <b style={{color:"#fff3ed"}}>{Math.round(avgCont/1400*100)}%</b> de un salario mínimo mensual en Guatemala.
                </div>
                <div style={{background:"rgba(255,255,255,0.15)",borderRadius:8,padding:"10px 14px",fontSize:11,color:"rgba(255,255,255,0.9)",lineHeight:1.6}}>
                  El salario mínimo en Guatemala es de <b>Q1,428/mes</b> (2024). Cada familia compromete el equivalente a más de un mes de salario para co-invertir en su propio hogar — eso es apropiación real del programa.
                </div>
              </div>

              {/* Valor del piso firme */}
              <div style={{background:`linear-gradient(135deg,${SECONDARY} 0%,#1e3018 100%)`,borderRadius:12,padding:24,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",right:-10,bottom:-10,fontSize:100,opacity:0.08}}>📐</div>
                <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.6)",marginBottom:8}}>📐 Valor del piso firme</div>
                <div style={{fontSize:15,fontWeight:700,color:"white",lineHeight:1.6,marginBottom:12}}>
                  <span style={{fontSize:40,fontWeight:800,color:"#c8e6c0",display:"block",lineHeight:1}}>${Math.round(avgTotal/TC/36).toFixed(1)}</span>
                  cuesta cada metro cuadrado de piso firme instalado — menos que una pizza en EE.UU., con impacto de por vida.
                </div>
                <div style={{background:"rgba(255,255,255,0.15)",borderRadius:8,padding:"10px 14px",fontSize:11,color:"rgba(255,255,255,0.9)",lineHeight:1.6}}>
                  Con un área promedio de <b>36 m²</b> por hogar y un costo total de <b>{fmtU(avgTotal)}</b>, el programa logra uno de los mejores ratios costo-impacto en salud preventiva de la región. El BID estima que cada dólar en piso firme ahorra <b>$3.50 en salud</b> a largo plazo.
                </div>
              </div>
            </div>

            {/* ── Banner total ejecutado ── */}
            <div style={{background:`linear-gradient(135deg,${PRIMARY} 0%,#8b3e25 100%)`,borderRadius:12,padding:"24px 32px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:-20,top:"50%",transform:"translateY(-50%)",fontSize:180,opacity:0.05}}>💰</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr auto 1fr",gap:0,alignItems:"center"}}>
                {[
                  {label:"Programa HogaRES",value:fmt(totalHog),usd:fmtU(totalHog),color:"#E8A882",icon:"🏠"},
                  null,
                  {label:"Licencia Social",value:fmt(totalLic),usd:fmtU(totalLic),color:"#F5C4AA",icon:"📋"},
                  null,
                  {label:"Contrapartida Familias",value:fmt(totalCont),usd:fmtU(totalCont),color:"#FFE0C8",icon:"🤝"},
                ].map((item,i)=>{
                  if(!item) return <div key={i} style={{textAlign:"center",color:"rgba(255,255,255,0.3)",fontSize:28,fontWeight:300}}>+</div>;
                  return (
                    <div key={i} style={{textAlign:"center",padding:"0 20px"}}>
                      <div style={{fontSize:20,marginBottom:6}}>{item.icon}</div>
                      <div style={{fontSize:22,fontWeight:800,color:item.color,lineHeight:1}}>{item.value}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:2}}>{item.usd} USD</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:4,textTransform:"uppercase",letterSpacing:"0.06em"}}>{item.label}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid rgba(255,255,255,0.15)",display:"flex",justifyContent:"center",alignItems:"baseline",gap:12}}>
                <span style={{fontSize:13,color:"rgba(255,255,255,0.6)"}}>INVERSIÓN TOTAL EJECUTADA</span>
                <span style={{fontSize:36,fontWeight:800,color:"white"}}>{fmt(grandTotal)}</span>
                <span style={{fontSize:18,fontWeight:700,color:"rgba(255,255,255,0.7)"}}>{fmtU(grandTotal)} USD</span>
              </div>
            </div>
          </>;
        })()}

        {tab==="materiales" && (()=>{
          // ── Especificaciones técnicas por hogar ──────────────────────────────
          // Piso firme: 36m², espesor 8cm → 2.88 m³ de concreto
          // Mezcla 1:2:3 (cemento:arena:piedrín)
          // Por m³: 6.5 bolsas cemento UGC 42.5kg, 0.55 m³ arena, 0.95 m³ piedrín
          const AREA_M2      = 36;
          const ESPESOR_M    = 0.08;
          const VOL_CONC     = AREA_M2 * ESPESOR_M;          // 2.88 m³
          const FACTOR_DESP  = 1.08;                          // 8% desperdicio
          const VOL_TOTAL    = VOL_CONC * FACTOR_DESP;

          const SACOS_M3     = 6.5;
          const ARENA_M3_M3  = 0.55;
          const PIEDRIN_M3M3 = 0.95;

          const sacosXHog    = Math.ceil(VOL_TOTAL * SACOS_M3);        // 21 bolsas
          const arenaXHog    = parseFloat((VOL_TOTAL * ARENA_M3_M3).toFixed(2));
          const piedrinXHog  = parseFloat((VOL_TOTAL * PIEDRIN_M3M3).toFixed(2));

          // Horas-hombre: contrapartida Q1,700 por hogar
          // Valor del jornal informal rural: Q80/día (8h) → Q10/h
          const JORNAL_DIA   = 80;
          const HRS_DIA      = 8;
          const JORNAL_HORA  = JORNAL_DIA / HRS_DIA;
          const hhXHog       = Math.round(1700 / JORNAL_HORA); // 170 h/hogar
          const diasXHog     = Math.round(hhXHog / HRS_DIA);

          // Totales del programa
          const n = construidos || data.length;
          const totalSacos   = sacosXHog   * n;
          const totalArena   = parseFloat((arenaXHog   * n).toFixed(1));
          const totalPiedrin = parseFloat((piedrinXHog * n).toFixed(1));
          const totalHH      = hhXHog * n;
          const totalDias    = Math.round(totalHH / HRS_DIA);
          const totalKgCem   = totalSacos * 42.5;
          const totalTonCem  = parseFloat((totalKgCem / 1000).toFixed(1));

          // Para la gráfica de barras comparativa
          const matData = [
            {name:"Cemento UGC", hogar:sacosXHog,   total:totalSacos,   unidad:"bolsas", color:SECONDARY},
            {name:"Arena",       hogar:arenaXHog,   total:totalArena,   unidad:"m³",     color:PRIMARY},
            {name:"Piedrín",     hogar:piedrinXHog, total:totalPiedrin, unidad:"m³",     color:ACCENT3},
          ];

          // Desglose de jornales por etapa de obra
          const etapas = [
            {etapa:"Trazo, nivelación y compactación", dias:4, trabajadores:3, pct:22, color:SECONDARY},
            {etapa:"Mezclado y vaciado",               dias:4, trabajadores:4, pct:25, color:PRIMARY},
            {etapa:"Acabado y regleado",               dias:3, trabajadores:3, pct:18, color:ACCENT3},
            {etapa:"Curado (7 días)",                  dias:7, trabajadores:1, pct:31, color:"#6B9E61"},
            {etapa:"Limpieza y entrega",               dias:1, trabajadores:2, pct:4,  color:"#94a3b8"},
          ];

          // Equivalencias curiosas
          const elefantes  = parseFloat((totalTonCem / 6.35).toFixed(1)); // elefante africano ≈6.35t
          const camiones   = Math.ceil(totalArena / 7);                   // camión: ~7 m³
          const anyosTrabajo= parseFloat((totalHH / 2080).toFixed(1));    // año laboral: 2,080h
          const maratones  = parseFloat((totalDias * 8 / 4.5).toFixed(0)); // 4.5h promedio maratón

          return <>
            {/* ── KPIs ─────────────────────────────────────────────────────── */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
              <KPICard title="Bolsas de Cemento UGC" value={totalSacos.toLocaleString()} sub={`${totalTonCem} ton · Uso General en la Construcción`} icon="🎒" accent={SECONDARY}/>
              <KPICard title="Arena" value={`${totalArena} m³`} sub={`${arenaXHog} m³ por hogar`} icon="🏖️" accent={PRIMARY}/>
              <KPICard title="Piedrín" value={`${totalPiedrin} m³`} sub={`${piedrinXHog} m³ por hogar`} icon="🪨" accent={ACCENT3}/>
              <KPICard title="Horas-Hombre Invertidas" value={totalHH.toLocaleString()} sub={`${diasXHog} días/hogar · ${anyosTrabajo} años/persona`} icon="👷" accent={SECONDARY}/>
            </div>

            {/* ── Ficha técnica por hogar + Barras de materiales ─────────── */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:16,marginBottom:16}}>

              {/* Ficha técnica */}
              <div style={{background:CARD,borderRadius:12,border:`2px solid ${SECONDARY}`,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
                <div style={{background:SECONDARY,padding:"14px 20px",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18}}>📋</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"white"}}>Ficha Técnica por Hogar</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>Piso firme · {AREA_M2} m² · {ESPESOR_M*100}cm espesor</div>
                  </div>
                </div>
                <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
                  {/* Cemento */}
                  <div style={{background:LIGHT_SECONDARY,borderRadius:10,padding:"12px 14px",border:`1px solid ${BORDER}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <span style={{fontSize:16}}>🎒</span>
                      <span style={{fontSize:11,fontWeight:700,color:SECONDARY}}>Cemento UGC 42.5kg</span>
                      <span style={{marginLeft:"auto",fontSize:14,fontWeight:800,color:SECONDARY}}>{sacosXHog} bolsas</span>
                    </div>
                    <div style={{fontSize:10,color:MUTED,lineHeight:1.5}}>
                      Cemento Portland UGC · Cementos Progreso<br/>
                      Uso General en la Construcción · 42.5kg<br/>
                      {(sacosXHog*42.5).toLocaleString()} kg · Q{(sacosXHog*85).toLocaleString()} estimado
                    </div>
                  </div>
                  {/* Arena */}
                  <div style={{background:"rgba(188,90,58,0.06)",borderRadius:10,padding:"12px 14px",border:`1px solid ${BORDER}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <span style={{fontSize:16}}>🏖️</span>
                      <span style={{fontSize:11,fontWeight:700,color:PRIMARY}}>Arena de río lavada</span>
                      <span style={{marginLeft:"auto",fontSize:14,fontWeight:800,color:PRIMARY}}>{arenaXHog} m³</span>
                    </div>
                    <div style={{fontSize:10,color:MUTED,lineHeight:1.5}}>
                      Granulometría media · zarandeada<br/>
                      {Math.round(arenaXHog*1600).toLocaleString()} kg · ~{Math.ceil(arenaXHog/0.18)} costales de 18kg
                    </div>
                  </div>
                  {/* Piedrín */}
                  <div style={{background:"rgba(212,132,95,0.08)",borderRadius:10,padding:"12px 14px",border:`1px solid ${BORDER}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <span style={{fontSize:16}}>🪨</span>
                      <span style={{fontSize:11,fontWeight:700,color:ACCENT3}}>Piedrín 3/4"</span>
                      <span style={{marginLeft:"auto",fontSize:14,fontWeight:800,color:ACCENT3}}>{piedrinXHog} m³</span>
                    </div>
                    <div style={{fontSize:10,color:MUTED,lineHeight:1.5}}>
                      Agregado grueso triturado<br/>
                      {Math.round(piedrinXHog*1500).toLocaleString()} kg · base compactada incluida
                    </div>
                  </div>
                  {/* HH */}
                  <div style={{background:"rgba(44,67,36,0.06)",borderRadius:10,padding:"12px 14px",border:`1px solid ${BORDER}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <span style={{fontSize:16}}>👷</span>
                      <span style={{fontSize:11,fontWeight:700,color:SECONDARY}}>Horas-hombre</span>
                      <span style={{marginLeft:"auto",fontSize:14,fontWeight:800,color:SECONDARY}}>{hhXHog} h</span>
                    </div>
                    <div style={{fontSize:10,color:MUTED,lineHeight:1.5}}>
                      ~{diasXHog} días de obra · jornal Q{JORNAL_DIA}/día<br/>
                      Estimado con base en contrapartida Q1,700
                    </div>
                  </div>
                  {/* Mezcla */}
                  <div style={{background:BG,borderRadius:8,padding:"8px 12px",border:`1px dashed ${BORDER}`,fontSize:10,color:MUTED,lineHeight:1.6,textAlign:"center"}}>
                    Mezcla diseño <b>1:2:3</b> (cemento : arena : piedrín)<br/>
                    Volumen de concreto: <b>{VOL_CONC.toFixed(2)} m³</b> + 8% desperdicio
                  </div>
                </div>
              </div>

              {/* Barras de materiales totales */}
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)",flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Materiales Totales del Programa</div>
                  <div style={{fontSize:11,color:MUTED,marginBottom:18}}>Suma de insumos para los {n} hogares · barras coloreadas por tipo de material</div>

                  {/* Visual de materiales tipo progress grande */}
                  <div style={{display:"flex",flexDirection:"column",gap:16}}>
                    {[
                      {label:"Bolsas cemento UGC 42.5kg",icon:"🎒",total:totalSacos,hogar:sacosXHog,unidad:"bolsas",color:SECONDARY,max:totalSacos,sub:`${totalTonCem} ton · ${(totalSacos*42.5/1000).toFixed(1)} ton de cemento puro`},
                      {label:"Arena de río",icon:"🏖️",total:totalArena,hogar:arenaXHog,unidad:"m³",color:PRIMARY,max:totalArena,sub:`≈ ${camiones*2} camiones de volteo de 3.5m³`},
                      {label:"Piedrín 3/4\"",icon:"🪨",total:totalPiedrin,hogar:piedrinXHog,unidad:"m³",color:ACCENT3,max:totalPiedrin,sub:`${Math.round(totalPiedrin*1500).toLocaleString()} kg de agregado grueso`},
                    ].map((m,i)=>(
                      <div key={i}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:18}}>{m.icon}</span>
                            <div>
                              <div style={{fontSize:12,fontWeight:700,color:TEXT}}>{m.label}</div>
                              <div style={{fontSize:10,color:MUTED}}>{m.sub}</div>
                            </div>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0,marginLeft:16}}>
                            <div style={{fontSize:20,fontWeight:800,color:m.color}}>{m.total.toLocaleString()}</div>
                            <div style={{fontSize:10,color:MUTED}}>{m.unidad} totales</div>
                          </div>
                        </div>
                        {/* Barra segmentada por hogar */}
                        <div style={{position:"relative",height:28,background:"#E5E0DB",borderRadius:8,overflow:"hidden"}}>
                          {Array.from({length:n}).map((_,idx)=>(
                            <div key={idx} style={{
                              position:"absolute",
                              left:`${(idx/n)*100}%`,
                              width:`${(1/n)*100 - 0.3}%`,
                              height:"100%",
                              background:m.color,
                              opacity:0.6+((idx%3)*0.13),
                              borderRadius:2,
                            }}/>
                          ))}
                          <div style={{position:"absolute",left:0,top:0,right:0,bottom:0,display:"flex",alignItems:"center",paddingLeft:10}}>
                            <span style={{fontSize:10,fontWeight:700,color:"white",textShadow:"0 1px 2px rgba(0,0,0,0.5)"}}>
                              {m.hogar} {m.unidad} × {n} hogares
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Etapas de obra + Gráfica Horas-Hombre ───────────────────── */}
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:16}}>

              {/* Donut etapas de obra */}
              <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Distribución de Horas-Hombre por Etapa de Obra</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:16}}>Estimación por fase constructiva para un piso firme de {AREA_M2}m²</div>
                <div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:20,alignItems:"center"}}>
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={etapas.map(e=>({name:e.etapa,value:e.pct}))} dataKey="value"
                        cx="50%" cy="50%" innerRadius={48} outerRadius={85} startAngle={90} endAngle={-270}>
                        {etapas.map((e,i)=><Cell key={i} fill={e.color}/>)}
                      </Pie>
                      <Tooltip contentStyle={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,fontSize:10}}
                        formatter={(v,n)=>[`${v}% del tiempo`,n]}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{display:"flex",flexDirection:"column",gap:7}}>
                    {etapas.map((e,i)=>{
                      const hh=Math.round(hhXHog*e.pct/100);
                      return (
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:10,height:10,borderRadius:2,background:e.color,flexShrink:0}}/>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                              <span style={{fontSize:10,color:TEXT,fontWeight:600}}>{e.etapa}</span>
                              <span style={{fontSize:10,fontWeight:800,color:e.color}}>{e.pct}%</span>
                            </div>
                            <div style={{background:"#E5E0DB",borderRadius:20,height:4}}>
                              <div style={{width:`${e.pct}%`,height:4,borderRadius:20,background:e.color}}/>
                            </div>
                            <div style={{fontSize:9,color:MUTED,marginTop:1}}>{hh}h · {e.trabajadores} trabajador{e.trabajadores>1?"es":""} · {e.dias} día{e.dias>1?"s":""}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Totales HH escalados */}
              <div style={{background:CARD,borderRadius:12,padding:24,border:`1px solid ${BORDER}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,color:SECONDARY,marginBottom:2}}>Esfuerzo Comunitario Total</div>
                <div style={{fontSize:11,color:MUTED,marginBottom:20}}>Horas invertidas por los {n} hogares del programa</div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {[
                    {icon:"⏱️",label:"Horas-hombre totales",value:totalHH.toLocaleString(),sub:"en todos los hogares",color:SECONDARY},
                    {icon:"📅",label:"Días de obra totales",value:totalDias.toLocaleString(),sub:`${Math.round(totalDias/n)} días por hogar`,color:PRIMARY},
                    {icon:"🗓️",label:"Equivale en años",value:`${anyosTrabajo} años`,sub:"de trabajo continuo 1 persona",color:ACCENT4},
                    {icon:"👷",label:"Por hogar",value:`${hhXHog}h`,sub:`${diasXHog} jornales · Q${(hhXHog*JORNAL_HORA).toLocaleString()}`,color:ACCENT3},
                  ].map((item,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:BG,border:`1px solid ${BORDER}`}}>
                      <span style={{fontSize:20,flexShrink:0}}>{item.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:10,color:MUTED,fontWeight:600}}>{item.label}</div>
                        <div style={{fontSize:16,fontWeight:800,color:item.color}}>{item.value}</div>
                        <div style={{fontSize:9,color:MUTED}}>{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Storytellings ─────────────────────────────────────────────── */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>

              {/* Cemento Progreso */}
              <div style={{background:`linear-gradient(135deg,${SECONDARY} 0%,#1a2c12 100%)`,borderRadius:12,padding:24,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",right:-10,bottom:-10,fontSize:100,opacity:0.07}}>🎒</div>
                <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.6)",marginBottom:8}}>🏭 Producción nacional</div>
                <div style={{fontSize:15,fontWeight:700,color:"white",lineHeight:1.6,marginBottom:12}}>
                  <span style={{fontSize:40,fontWeight:800,color:"#c8e6c0",display:"block",lineHeight:1}}>{totalTonCem} ton</span>
                  de cemento UGC de Cementos Progreso — equivalente al peso de <b style={{color:"#c8e6c0"}}>{elefantes} elefantes africanos</b>.
                </div>
                <div style={{background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"10px 14px",fontSize:11,color:"rgba(255,255,255,0.9)",lineHeight:1.6}}>
                  El cemento UGC (Uso General en la Construcción) de Cementos Progreso es el estándar para obra civil en Guatemala. Con <b>{totalSacos.toLocaleString()} bolsas de 42.5kg</b>, el programa HogaRES convierte polvo gris en dignidad concreta para {n} familias.
                </div>
              </div>

              {/* Manos que construyen */}
              <div style={{background:`linear-gradient(135deg,${PRIMARY} 0%,#8b3e25 100%)`,borderRadius:12,padding:24,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",right:-10,bottom:-10,fontSize:100,opacity:0.07}}>👷</div>
                <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.6)",marginBottom:8}}>👐 Trabajo comunitario</div>
                <div style={{fontSize:15,fontWeight:700,color:"white",lineHeight:1.6,marginBottom:12}}>
                  <span style={{fontSize:40,fontWeight:800,color:"#ffe0d0",display:"block",lineHeight:1}}>{totalHH.toLocaleString()}h</span>
                  de trabajo invertidas por las propias familias — suficiente para correr <b style={{color:"#ffe0d0"}}>{maratones} maratones</b> completos sin parar.
                </div>
                <div style={{background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"10px 14px",fontSize:11,color:"rgba(255,255,255,0.9)",lineHeight:1.6}}>
                  La contrapartida no es solo dinero — es sudor. Cada familia aporta en promedio <b>{diasXHog} días de trabajo físico</b> como parte del modelo tripartito. Esa participación garantiza apropiación, mantenimiento y orgullo del resultado final.
                </div>
              </div>
            </div>

            {/* ── Banner de equivalencias ──────────────────────────────────── */}
            <div style={{background:`linear-gradient(135deg,#4A7A40 0%,#2C4324 100%)`,borderRadius:12,padding:"22px 28px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:-20,top:"50%",transform:"translateY(-50%)",fontSize:160,opacity:0.05}}>🏗️</div>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16}}>📊 Datos en perspectiva — equivalencias del programa</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:20}}>
                {[
                  {icon:"🐘",label:"Peso del cemento",value:`${elefantes} elefantes`,sub:"africanos (≈6.35 ton c/u)"},
                  {icon:"🚛",label:"Camiones de arena",value:`${Math.ceil(totalArena/3.5)}`,sub:"camiones de volteo 3.5m³"},
                  {icon:"🏊",label:"Volumen piedrín",value:`${totalPiedrin}m³`,sub:`≈ ${Math.round(totalPiedrin/250*100)/100} piscinas olímpicas`},
                  {icon:"🗓️",label:"Horas-hombre",value:`${anyosTrabajo} años`,sub:"de trabajo de 1 persona"},
                ].map((item,i)=>(
                  <div key={i} style={{textAlign:"center"}}>
                    <div style={{fontSize:32,marginBottom:6}}>{item.icon}</div>
                    <div style={{fontSize:20,fontWeight:800,color:"#E8A882",lineHeight:1}}>{item.value}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:2}}>{item.label}</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",marginTop:2}}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </>;
        })()}

        {tab==="mapa" && <MapaTab data={data}/>}

        {tab==="beneficiarios" && (()=>{
          const visibles = filtered.filter(r=> statusBenef==="Todos" ? true : r.status===statusBenef);
          const statusCounts = ["Todos",...Object.keys(STATUS_COLORS).filter(s=>s!=="Censado")].map(s=>({
            s, count: s==="Todos" ? filtered.length : filtered.filter(r=>r.status===s).length,
          })).filter(({s,count})=>count>0||s==="Todos");
          return <>
            {/* Filtros */}
            <div style={{display:"flex",gap:10,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
              <input placeholder="🔍 Buscar por nombre o código..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:"1 1 200px",padding:"9px 16px",background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,color:TEXT,fontSize:13,outline:"none"}}/>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {statusCounts.map(({s,count})=>{
                  const color=s==="Todos"?SECONDARY:STATUS_COLORS[s];
                  const icon=s==="Todos"?"🗂️":STATUS_ICONS[s];
                  const active=statusBenef===s;
                  return(
                    <button key={s} onClick={()=>setStatusBenef(s)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",borderRadius:20,cursor:"pointer",border:`1.5px solid ${active?color:BORDER}`,background:active?`${color}15`:CARD,color:active?color:MUTED,fontSize:11,fontWeight:600}}>
                      <span style={{fontSize:12}}>{icon}</span>{s==="Todos"?"Todos":s}
                      <span style={{background:active?color:"#E5E0DB",color:active?"white":MUTED,borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:700}}>{count}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{background:LIGHT_PRIMARY,color:PRIMARY,padding:"9px 14px",borderRadius:8,fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{visibles.length} registros</div>
            </div>
            <div style={{background:CARD,borderRadius:12,border:`1px solid ${BORDER}`,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:SECONDARY}}>
                      {["#","Código","Beneficiario","Comunidad","Edad","Profesión","Pared","Agua","Drenaje","Ingreso","Status"].map(h=>(
                        <th key={h} style={{padding:"11px 14px",textAlign:"left",color:"rgba(255,255,255,0.85)",fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((r,i)=>{
                      const sc=STATUS_COLORS[r.status]||SECONDARY;
                      return (
                        <tr key={r.codigo} style={{background:i%2===0?CARD:BG,borderBottom:`1px solid ${BORDER}`,transition:"background 0.1s"}}
                          onMouseEnter={e=>e.currentTarget.style.background=LIGHT_SECONDARY}
                          onMouseLeave={e=>e.currentTarget.style.background=i%2===0?CARD:BG}>
                          <td style={{padding:"9px 14px",color:MUTED,fontSize:10}}>{i+1}</td>
                          <td style={{padding:"9px 14px",color:PRIMARY,fontWeight:700,fontSize:11,whiteSpace:"nowrap"}}>{r.codigo}</td>
                          <td style={{padding:"9px 14px",color:TEXT,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500}}>{r.nombre}</td>
                          <td style={{padding:"9px 14px",color:MUTED,fontSize:11,whiteSpace:"nowrap"}}>{r.comunidad}</td>
                          <td style={{padding:"9px 14px",color:MUTED,textAlign:"center"}}>{r.edad}</td>
                          <td style={{padding:"9px 14px",color:MUTED,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.profesion}</td>
                          <td style={{padding:"9px 14px",color:MUTED,fontSize:11}}>{r.pared}</td>
                          <td style={{padding:"9px 14px"}}><span style={{background:r.agua==="Si"?LIGHT_SECONDARY:LIGHT_PRIMARY,color:r.agua==="Si"?SECONDARY:PRIMARY,padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700}}>{r.agua==="Si"?"✓ Sí":"✗ No"}</span></td>
                          <td style={{padding:"9px 14px",color:MUTED,fontSize:11,whiteSpace:"nowrap"}}>{r.drenaje}</td>
                          <td style={{padding:"9px 14px",color:SECONDARY,fontWeight:700,whiteSpace:"nowrap"}}>Q{r.ingreso.toLocaleString()}</td>
                          <td style={{padding:"9px 14px",whiteSpace:"nowrap"}}><span style={{background:`${sc}18`,color:sc,border:`1px solid ${sc}44`,padding:"3px 9px",borderRadius:20,fontSize:10,fontWeight:700}}>{STATUS_ICONS[r.status]||"●"} {r.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{padding:"10px 16px",color:MUTED,fontSize:11,borderTop:`1px solid ${BORDER}`,background:BG,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span>Mostrando <b>{visibles.length}</b> de <b>{total}</b> beneficiarios · {filterLabel}</span>
                <span style={{color:SECONDARY,fontWeight:600}}>{total} hogares · {personas.toLocaleString()} personas beneficiadas</span>
              </div>
            </div>
          </>;
        })()}

      </div>

      {/* ── Footer ── */}
      <div style={{background:SECONDARY,padding:"14px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginTop:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:26,height:26,background:PRIMARY,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🏠</div>
          <span style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.9)"}}>Hoga<span style={{color:"#E8A882"}}>RES</span></span>
          <span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>·</span>
          <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Dashboard de Seguimiento Técnico · Asunción Chivoc</span>
        </div>
        <div style={{display:"flex",gap:20,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:construidos===total?"#6FCF97":PRIMARY}}/>
            <span style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>
              {construidos===total
                ? `✅ ${total}/${total} hogares completados`
                : `${construidos} de ${total} hogares construidos · ${pctAvance}% avance`}
            </span>
          </div>
          <span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>Programa tripartito · HogaRES + Lic. Social + Familias</span>
        </div>
      </div>
    </div>
  );
}
