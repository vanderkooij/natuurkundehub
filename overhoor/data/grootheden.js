/* Elke grootheid wordt één keer gedefinieerd, genest onder de BOVENBOUW-categorie
   (Mechanica, Golven & geluid, …). Het veld `lv` (ob/hv/vw) bepaalt vanaf welk
   niveau een grootheid in beeld komt (cumulatief).

   ONDERBOUW gebruikt een eigen, thematische indeling. Voor elke grootheid met
   lv:'ob' geeft `obCat` aan onder welk onderbouwthema hij daar valt:
     beweging · energie · stoffen · geluid · elektriciteit · warmte
   Rijen zonder obCat (bijv. later via de admin toegevoegd) belanden op onderbouw
   in de categorie "Overig", zodat ze nooit onzichtbaar worden. */
const CATS_DATA=[
  {key:'mech',label:'Mechanica',def:true,rows:[
    {lv:'ob',obCat:'beweging',naam:'massa',sym:'m',eenh:'kilogram',esym:'kg'},
    {lv:'ob',obCat:'beweging',naam:'afstand',sym:'s',eenh:'meter',esym:'m'},
    {lv:'ob',obCat:'beweging',naam:'tijd',sym:'t',eenh:'seconde',esym:'s'},
    {lv:'ob',obCat:'beweging',naam:'snelheid',sym:'v',eenh:'meter per seconde',esym:'m/s'},
    {lv:'ob',obCat:'beweging',naam:'versnelling',sym:'a',eenh:'meter per secondekwadraat',esym:'m/s²'},
    {lv:'ob',obCat:'beweging',naam:'kracht',sym:'F',eenh:'newton',esym:'N'},
    {lv:'ob',obCat:'beweging',naam:'zwaartekracht',sym:'F_z; Fz',eenh:'newton',esym:'N'},
    {lv:'ob',obCat:'beweging',naam:'valversnelling; gravitatieversnelling',sym:'g',eenh:'meter per secondekwadraat',esym:'m/s²'},
    {lv:'ob',obCat:'stoffen',naam:'druk',sym:'p',eenh:'pascal; newton per vierkante meter',esym:'Pa; N/m²; N m⁻²'},
    {lv:'ob',obCat:'stoffen',naam:'dichtheid',sym:'ρ',eenh:'kilogram per kubieke meter',esym:'kg/m³; kg m⁻³'},
    {lv:'ob',obCat:'stoffen',naam:'oppervlakte',sym:'A',eenh:'vierkante meter',esym:'m²'},
    {lv:'ob',obCat:'stoffen',naam:'volume',sym:'V',eenh:'kubieke meter',esym:'m³'},
    {lv:'ob',obCat:'energie',naam:'arbeid',sym:'W',eenh:'joule; kilowattuur',esym:'J; kWh'},
    {lv:'ob',obCat:'energie',naam:'energie',sym:'E',eenh:'joule; kilowattuur',esym:'J; kWh'},
    {lv:'ob',obCat:'energie',naam:'vermogen',sym:'P',eenh:'watt; kilowatt',esym:'W; kW; J/s'},
    {lv:'hv',naam:'plaats; positie',sym:'x',eenh:'meter',esym:'m'},
    {lv:'hv',naam:'verplaatsing',sym:'Δx',eenh:'meter',esym:'m'},
    {lv:'hv',naam:'impuls',sym:'p',eenh:'kilogram meter per seconde; newtonseconde',esym:'kg·m/s; kg m s⁻¹; N·s; Ns'},
    {lv:'hv',naam:'moment',sym:'M',eenh:'newton meter',esym:'N·m; Nm'},
    {lv:'hv',naam:'arm',sym:'r',eenh:'meter',esym:'m'},
    {lv:'hv',naam:'straal',sym:'r',eenh:'meter',esym:'m'},
    {lv:'hv',naam:'hoogte',sym:'h',eenh:'meter',esym:'m'},
    {lv:'hv',naam:'dikte',sym:'d',eenh:'meter',esym:'m'},
    {lv:'hv',naam:'uitwijking / uitrekking',sym:'u',eenh:'meter',esym:'m'},
    {lv:'hv',naam:'veerconstante',sym:'C',eenh:'newton per meter',esym:'N/m; N m⁻¹'},
    {lv:'vw',naam:'elasticiteitsmodulus',sym:'E',eenh:'newton per vierkante meter',esym:'N/m²; N m⁻²; Pa'},
  ]},
  {key:'golf',label:'Golven & geluid',def:true,rows:[
    {lv:'ob',obCat:'geluid',naam:'frequentie',sym:'f',eenh:'hertz',esym:'Hz; s⁻¹'},
    {lv:'ob',obCat:'geluid',naam:'periode; trillingstijd',sym:'T',eenh:'seconde',esym:'s'},
    {lv:'hv',naam:'golflengte',sym:'λ',eenh:'meter',esym:'m'},
    {lv:'hv',naam:'amplitude',sym:'A',eenh:'meter',esym:'m'},
    {lv:'hv',naam:'golfsnelheid',sym:'v',eenh:'meter per seconde',esym:'m/s'},
    {lv:'hv',naam:'intensiteit',sym:'I',eenh:'watt per vierkante meter',esym:'W/m²; W m⁻²'},
    {lv:'hv',naam:'geluidsdruk- / intensiteitsniveau; geluidsniveau; geluidsdrukniveau',sym:'L',eenh:'decibel',esym:'dB'},
    {lv:'hv',naam:'voortplantingssnelheid van licht; lichtsnelheid',sym:'c',eenh:'meter per seconde',esym:'m/s'},
  ]},
  {key:'optica',label:'Optica',def:false,rows:[
    {lv:'hv',naam:'brekingsindex',sym:'n',eenh:'(geen eenheid); geen eenheid; geen; -',esym:'-; geen; (geen eenheid)'},
    {lv:'hv',naam:'voorwerpsafstand',sym:'v',eenh:'meter',esym:'m'},
    {lv:'hv',naam:'beeldafstand',sym:'b',eenh:'meter',esym:'m'},
    {lv:'hv',naam:'brandpuntsafstand',sym:'f',eenh:'meter',esym:'m'},
    {lv:'hv',naam:'vergroting',sym:'N',eenh:'(geen eenheid); geen eenheid; geen; -',esym:'-; geen; (geen eenheid)'},
    {lv:'hv',naam:'lenssterkte',sym:'S',eenh:'dioptrie',esym:'dpt; m⁻¹; 1/m'},
    {lv:'hv',naam:'grenshoek',sym:'g',eenh:'graad',esym:'°'},
  ]},
  {key:'elek',label:'Elektriciteit & magnetisme',def:true,rows:[
    {lv:'ob',obCat:'elektriciteit',naam:'elektrische spanning',sym:'U',eenh:'volt',esym:'V'},
    {lv:'ob',obCat:'elektriciteit',naam:'elektrische stroomsterkte',sym:'I',eenh:'ampere',esym:'A'},
    {lv:'ob',obCat:'elektriciteit',naam:'weerstand',sym:'R',eenh:'ohm',esym:'Ω; ohm'},
    {lv:'ob',obCat:'elektriciteit',naam:'vermogen',sym:'P',eenh:'watt; kilowatt',esym:'W; kW'},
    {lv:'ob',obCat:'elektriciteit',naam:'energie',sym:'E',eenh:'joule; kilowattuur',esym:'J; kWh'},
    {lv:'ob',obCat:'elektriciteit',naam:'elektrische lading',sym:'Q',eenh:'coulomb',esym:'C'},
    {lv:'hv',naam:'soortelijke weerstand',sym:'ρ',eenh:'ohm meter',esym:'Ω·m; Ω m; ohm·m; ohm m'},
    {lv:'vw',naam:'capaciteit condensator',sym:'C',eenh:'farad',esym:'F'},
    {lv:'vw',naam:'elektrische potentiaal',sym:'V',eenh:'volt',esym:'V'},
    {lv:'vw',naam:'elektrische veldsterkte',sym:'E',eenh:'newton per coulomb; volt per meter',esym:'N/C; N C⁻¹; V/m; V m⁻¹'},
    {lv:'vw',naam:'magnetische veldsterkte',sym:'B',eenh:'tesla',esym:'T'},
    {lv:'vw',naam:'magnetische flux',sym:'Φ',eenh:'weber',esym:'Wb'},
    {lv:'vw',naam:'zelfinductie',sym:'L',eenh:'henry',esym:'H'},
  ]},
  {key:'thermo',label:'Thermodynamica & warmte',def:true,rows:[
    {lv:'ob',obCat:'warmte',naam:'temperatuur',sym:'T; θ',eenh:'kelvin; graden Celsius',esym:'K; °C'},
    {lv:'ob',obCat:'warmte',naam:'warmte',sym:'Q',eenh:'joule',esym:'J'},
    {lv:'ob',obCat:'warmte',naam:'soortelijke warmte',sym:'c',eenh:'joule per kilogram kelvin',esym:'J/(kg·K); J/kg/K; J kg⁻¹ K⁻¹'},
    {lv:'ob',obCat:'warmte',naam:'warmtecapaciteit',sym:'C',eenh:'joule per kelvin',esym:'J/K; J K⁻¹'},
    {lv:'hv',naam:'warmtestroom',sym:'P',eenh:'watt',esym:'W'},
    {lv:'hv',naam:'warmtegeleidingscoëfficiënt',sym:'λ',eenh:'watt per meter kelvin',esym:'W/(m·K); W/m/K; W m⁻¹ K⁻¹'},
    {lv:'hv',naam:'debiet / volumestroom',sym:'Q',eenh:'kubieke meter per seconde',esym:'m³/s; m³ s⁻¹'},
    {lv:'hv',naam:'hoeveelheid stof',sym:'n',eenh:'mol',esym:'mol'},
    {lv:'hv',naam:'concentratie',sym:'c',eenh:'mol per kubieke meter',esym:'mol/m³; mol m⁻³'},
  ]},
  {key:'kern',label:'Kernfysica & straling',def:true,rows:[
    {lv:'hv',naam:'activiteit',sym:'A',eenh:'becquerel',esym:'Bq; s⁻¹'},
    {lv:'hv',naam:'geabsorbeerde dosis',sym:'D',eenh:'gray',esym:'Gy'},
    {lv:'hv',naam:'dosisequivalent',sym:'H',eenh:'sievert',esym:'Sv'},
    {lv:'hv',naam:'halveringstijd',sym:'t½',eenh:'seconde',esym:'s'},
    {lv:'hv',naam:'halveringsdikte',sym:'d½',eenh:'meter',esym:'m'},
    {lv:'hv',naam:'massagetal',sym:'A',eenh:'(geen eenheid); geen eenheid; geen; -',esym:'-; geen; (geen eenheid)'},
    {lv:'hv',naam:'atoomnummer',sym:'Z',eenh:'(geen eenheid); geen eenheid; geen; -',esym:'-; geen; (geen eenheid)'},
    {lv:'hv',naam:'stralingsweegfactor',sym:'w_R',eenh:'(geen eenheid); geen eenheid; geen; -',esym:'-; geen; (geen eenheid)'},
    {lv:'hv',naam:'fotonenergie',sym:'E',eenh:'joule; elektronvolt; electronvolt',esym:'J; eV'},
    {lv:'vw',naam:'vervalconstante',sym:'λ',eenh:'per seconde',esym:'s⁻¹'},
  ]},
];

/* Onderbouwthema's, in weergavevolgorde. Labels worden ook door de tool gebruikt. */
const OB_CATS=[
  {key:'beweging',      label:'Beweging'},
  {key:'energie',       label:'Energie'},
  {key:'stoffen',       label:'Stoffen & materialen'},
  {key:'geluid',        label:'Geluid'},
  {key:'elektriciteit', label:'Elektriciteit'},
  {key:'warmte',        label:'Warmte'},
];

window.CATS_DATA = CATS_DATA;
window.OB_CATS = OB_CATS;
