import { ArrowUpDown, Bath, BedDouble, Building2, Car, ChefHat, DoorOpen, House, Layers, Lightbulb, MoveVertical, PanelTop, Sofa, SquareDashed, Trees, Warehouse, Wrench, type LucideIcon } from 'lucide-react';

/** Shared by editable CAD, zone inspector and reusable public preview. */
export const BLUEPRINT_ICONS: Record<string, LucideIcon> = {
  'bld.building': Building2, 'bld.basement': Car, 'bld.ground_lobby': DoorOpen,
  'bld.typical_floors': Layers, 'bld.roof': House, 'bld.unit': House,
  'bld.entrance_gate': DoorOpen, 'bld.entrance_lobby': DoorOpen, 'bld.staircase': MoveVertical,
  'bld.elevator': ArrowUpDown, 'bld.lightwell': SquareDashed, 'bld.service': Wrench,
  'bld.central_corridor': Layers, 'bld.electric_box': Lightbulb, 'bld.water_motors': Wrench,
  'bld.garage_bays': Car, 'bld.guard_room': Wrench, 'bld.commercial_shop': Warehouse,
  'bld.balcony': PanelTop, 'bld.roof_terrace': Trees, 'bld.roof_service': Wrench,
  'apt.reception': Sofa, 'apt.master_bed': BedDouble, 'apt.std_bed': BedDouble,
  'apt.master_bath': Bath, 'apt.main_bath': Bath, 'apt.guest_bath': Bath,
  'apt.kitchen': ChefHat, 'apt.balcony': PanelTop, 'apt.corridor': Layers,
  'apt.laundry': Wrench, 'apt.dressing': Warehouse, 'apt.level': Layers,
  'grg.garage': Car, 'grg.ramp': Car, 'grg.bay': Car, 'grg.elec': Lightbulb,
  'grg.security_booth': Wrench, 'grg.storage': Warehouse,
};
