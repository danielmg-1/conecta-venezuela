export const ESTADOS_VE = [
  "Amazonas","Anzoátegui","Apure","Aragua","Barinas","Bolívar","Carabobo","Cojedes","Delta Amacuro",
  "Distrito Capital","Falcón","Guárico","Lara","Mérida","Miranda","Monagas","Nueva Esparta","Portuguesa",
  "Sucre","Táchira","Trujillo","Vargas (La Guaira)","Yaracuy","Zulia",
] as const;
export type EstadoVE = (typeof ESTADOS_VE)[number];