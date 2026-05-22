use std::cell::{Cell, RefCell};
use std::cmp::Ordering;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::f64::consts::PI;
use std::fs;
use std::path::{Path, PathBuf};
use std::rc::Rc;
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

use adw::prelude::*;
use glib::object::IsA;
use gtk::glib;
use pokedia_lib::models::{
    AbilityDetail, AbilityPokemonEntry, AbilitySummary, EvolutionNode, GameSummary, ItemDetail,
    ItemSummary, MoveDetail, MovePokemonEntry, MoveSummary, NatureSummary, PokemonAbility,
    PokemonDetail, PokemonMoveEntry, PokemonSummary, SyncResourceStatus,
};
use pokedia_lib::native;
use serde::{Deserialize, Serialize};

const APP_ID: &str = "com.pokedia.app.Gtk";
const COMPARE_LIMIT: usize = 8;
const ACTIVE_WINDOW_OPACITY: f64 = 0.78;
const WORKSPACE_AUTOSAVE_INTERVAL: Duration = Duration::from_secs(2);
const WORKSPACE_MENU_OFFSET_X: i32 = 68;
const WORKSPACE_MENU_OFFSET_Y: i32 = 58;
const FILTER_DROPDOWN_MIN_WIDTH: i32 = 118;
const FILTER_DROPDOWN_MAX_HEIGHT: i32 = 336;
const ALL_TYPES: &[&str] = &[
    "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
    "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
];
const GENERATION_RANGES: &[(i64, i64)] = &[
    (1, 151),
    (152, 251),
    (252, 386),
    (387, 493),
    (494, 649),
    (650, 721),
    (722, 809),
    (810, 905),
    (906, 1025),
];
const GENERATION_LABELS: &[&str] = &[
    "All gens", "Gen I", "Gen II", "Gen III", "Gen IV", "Gen V", "Gen VI", "Gen VII", "Gen VIII",
    "Gen IX",
];
const POKEDEX_SORT_LABELS: &[&str] = &[
    "Sort: #ID",
    "Sort: Name",
    "Sort: BST",
    "Sort: HP",
    "Sort: Atk",
    "Sort: Def",
    "Sort: SpA",
    "Sort: SpD",
    "Sort: Spe",
];
const MOVE_CLASS_OPTIONS: &[&str] = &["All classes", "Physical", "Special", "Status"];
const MOVE_MIN_POWER_LABELS: &[&str] = &["Min power", ">= 40", ">= 60", ">= 80", ">= 100"];
const MOVE_MIN_POWER_VALUES: &[Option<i64>] = &[None, Some(40), Some(60), Some(80), Some(100)];
const MOVE_MAX_POWER_LABELS: &[&str] = &["Max power", "<= 40", "<= 60", "<= 80", "<= 100"];
const MOVE_MAX_POWER_VALUES: &[Option<i64>] = &[None, Some(40), Some(60), Some(80), Some(100)];
const NATURE_STAT_KEYS: &[&str] = &[
    "attack",
    "defense",
    "special-attack",
    "special-defense",
    "speed",
];

const STYLE: &str = r#"
window,
window.background,
window.pokedia-window,
window.pokedia-window:backdrop,
window.pokedia-window > contents,
window.pokedia-window:backdrop > contents {
  background: transparent;
  background-color: transparent;
  background-image: none;
}

.background,
.background:backdrop,
.view,
.view:backdrop,
box.background,
box.background:backdrop,
toolbarview,
toolbarview:backdrop,
stack,
stack:backdrop,
scrolledwindow,
scrolledwindow:backdrop,
viewport,
viewport:backdrop,
listview,
listview:backdrop,
list,
list:backdrop,
row,
row:backdrop {
  background-color: transparent;
  background-image: none;
}

window.pokedia-window .pokedia-root,
window.pokedia-window:backdrop .pokedia-root {
  background: rgba(22, 22, 25, .16);
  border: 1px solid rgba(255, 255, 255, .055);
  border-radius: 18px;
  color: #f4f4f5;
}

window.pokedia-window scrolledwindow,
window.pokedia-window viewport,
window.pokedia-window listview,
window.pokedia-window flowbox,
window.pokedia-window list,
window.pokedia-window row,
window.pokedia-window:backdrop scrolledwindow,
window.pokedia-window:backdrop viewport,
window.pokedia-window:backdrop listview,
window.pokedia-window:backdrop flowbox,
window.pokedia-window:backdrop list,
window.pokedia-window:backdrop row {
  background: transparent;
}

window.pokedia-window headerbar.app-header,
window.pokedia-window headerbar.app-header:backdrop {
  background: transparent;
  background-image: none;
  border: none;
  border-radius: 18px 18px 0 0;
  box-shadow: none;
  color: rgba(245, 247, 252, .92);
  min-height: 48px;
  padding-left: 10px;
  padding-right: 10px;
}

window.pokedia-window headerbar.app-header button,
window.pokedia-window headerbar.app-header button:backdrop,
window.pokedia-window headerbar.app-header entry,
window.pokedia-window headerbar.app-header entry:backdrop {
  opacity: 1;
}

.app-brand {
  margin-left: 4px;
  margin-right: 12px;
}

.app-brand-logo {
  min-height: 22px;
  min-width: 22px;
}

.app-search,
.app-search:backdrop {
  background: rgba(255, 255, 255, .042);
  border: 1px solid rgba(255, 255, 255, .065);
  border-radius: 999px;
  color: rgba(245, 247, 252, .92);
  min-height: 34px;
}

.workspace-button,
.workspace-button:backdrop,
button.workspace-button,
button.workspace-button:backdrop,
menubutton.workspace-button,
menubutton.workspace-button:backdrop {
  background: transparent;
  background-image: none;
  border: none;
  box-shadow: none;
  color: rgba(245, 247, 252, .82);
  margin-left: 0;
  margin-right: 10px;
  min-height: 30px;
  padding: 0;
}

button.workspace-button,
button.workspace-button:backdrop,
menubutton.workspace-button button,
menubutton.workspace-button button.toggle,
menubutton.workspace-button:backdrop button,
menubutton.workspace-button:backdrop button.toggle {
  background-color: rgba(255, 255, 255, .030);
  background-image:
    linear-gradient(to bottom, rgba(255, 255, 255, .060), rgba(255, 255, 255, .018));
  border: 1px solid rgba(255, 255, 255, .070);
  border-radius: 999px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .105),
    0 5px 16px rgba(0, 0, 0, .07);
  color: rgba(245, 247, 252, .84);
  min-height: 30px;
  min-width: 112px;
  padding: 0 8px;
}

button.workspace-button:hover,
button.workspace-button:checked,
menubutton.workspace-button:hover button,
menubutton.workspace-button:hover button.toggle,
menubutton.workspace-button button:hover,
menubutton.workspace-button button.toggle:hover,
menubutton.workspace-button button:checked,
menubutton.workspace-button button.toggle:checked {
  background-color: rgba(255, 255, 255, .052);
  background-image:
    linear-gradient(to bottom, rgba(255, 255, 255, .095), rgba(255, 255, 255, .034));
  border-color: rgba(255, 255, 255, .130);
  color: #ffffff;
}

.workspace-label {
  font-weight: 700;
}

popover.workspace-popover,
popover.workspace-popover:backdrop {
  background-color: transparent;
  background-image: none;
  box-shadow: none;
  padding: 0;
}

popover.workspace-popover contents,
popover.workspace-popover > contents,
popover.workspace-popover contents:backdrop,
popover.workspace-popover:backdrop > contents {
  background-color: transparent;
  background-image: none;
  border: none;
  border-radius: 14px;
  box-shadow: none;
  padding: 0;
}

popover.workspace-popover arrow {
  background-color: rgba(28, 29, 34, .28);
  border: 1px solid rgba(255, 255, 255, .140);
}

.workspace-menu {
  background-color: transparent;
  background-image: none;
  min-width: 258px;
  padding: 15px;
}

.workspace-title {
  color: rgba(255, 255, 255, .86);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .06em;
  margin: 2px 6px 4px;
  text-transform: uppercase;
}

.workspace-line {
  border-radius: 10px;
  min-height: 34px;
}

.workspace-row,
.workspace-action {
  border-radius: 10px;
  color: rgba(255, 255, 255, .96);
  font-weight: 700;
  min-height: 34px;
  padding: 0 9px;
}

.workspace-row:hover,
.workspace-action:hover {
  background: rgba(255, 255, 255, .055);
  color: #ffffff;
}

.workspace-row.workspace-active {
  background: rgba(255, 255, 255, .038);
  box-shadow: none;
  color: #ffffff;
  font-weight: 800;
}

.workspace-menu image,
.workspace-menu label {
  color: inherit;
}

.workspace-meta {
  color: rgba(235, 238, 246, .42);
  font-size: 11px;
}

.workspace-icon-button {
  border-radius: 999px;
  min-height: 28px;
  min-width: 28px;
  padding: 0;
}

.workspace-danger:hover {
  background: rgba(239, 68, 68, .16);
  color: #ff8d9d;
}

.workspace-dialog-content {
  margin: 12px;
  min-width: 340px;
}

.app-tabbar,
.app-tabbar:backdrop {
  background: transparent;
  background-image: none;
  border: none;
  box-shadow: none;
  color: rgba(245, 247, 252, .88);
  padding: 4px 4px 7px 3px;
}

.app-tabbar .box,
.app-tabbar .box:backdrop {
  background: transparent;
  background-image: none;
  border: none;
  box-shadow: none;
}

.app-tabbar tab,
.app-tabbar tab:backdrop {
  min-height: 30px;
  opacity: 1;
}

.sidebar-pane {
  background: rgba(255, 255, 255, .034);
  border: 1px solid rgba(255, 255, 255, .058);
  border-radius: 18px;
}

.sidebar-section {
  color: rgba(235, 238, 246, .48);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.nav-row {
  border-radius: 10px;
  color: rgba(235, 238, 246, .70);
  margin: 2px 8px;
  padding: 8px 10px;
}

.nav-row:hover {
  background: rgba(255, 255, 255, .08);
}

.nav-row.selected-nav {
  background: rgba(255, 103, 132, .20);
  color: #ff6f90;
  font-weight: 700;
}

.header-title {
  font-size: 17px;
  font-weight: 800;
}

.page {
  background: transparent;
}

.section-card {
  background: rgba(255, 255, 255, .025);
  border: 1px solid rgba(255, 255, 255, .055);
  border-radius: 14px;
}

.detail-content-card {
  padding: 12px;
}

.toolbar-card {
  background: rgba(255, 255, 255, .034);
  border: 1px solid rgba(255, 255, 255, .058);
  border-radius: 12px;
  padding: 7px 10px;
}

.filter-dropdown {
  min-width: 118px;
}

button.filter-dropdown,
button.filter-dropdown:backdrop {
  background-color: rgba(255, 255, 255, .036);
  background-image:
    linear-gradient(to bottom, rgba(255, 255, 255, .074), rgba(255, 255, 255, .030));
  border: 1px solid rgba(255, 255, 255, .090);
  border-radius: 10px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .115),
    inset 1px 0 0 rgba(255, 255, 255, .045);
  color: rgba(245, 247, 252, .88);
  min-height: 34px;
  padding: 0 11px;
}

button.filter-dropdown:hover,
button.filter-dropdown.filter-open,
button.filter-dropdown:checked,
button.filter-dropdown:active,
button.filter-dropdown:focus,
button.filter-dropdown:focus-visible {
  background-color: rgba(255, 255, 255, .052);
  background-image:
    linear-gradient(to bottom, rgba(255, 255, 255, .095), rgba(255, 255, 255, .034));
  border-color: rgba(255, 255, 255, .130);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .105);
  color: #ffffff;
}

button.filter-dropdown image {
  color: rgba(235, 238, 246, .58);
}

button.filter-dropdown label {
  color: inherit;
  font-weight: 600;
}

.workspace-menu.filter-menu {
  min-width: 0;
  padding: 8px;
}

.filter-menu-scroller,
.filter-menu-scroller viewport {
  background: transparent;
  background-image: none;
  border: none;
}

.filter-menu-scroller scrollbar {
  background: transparent;
  border: none;
  margin: 2px 0 2px 4px;
  min-width: 7px;
}

.filter-menu-scroller scrollbar trough {
  background: rgba(255, 255, 255, .030);
  border-radius: 999px;
  min-width: 7px;
}

.filter-menu-scroller scrollbar slider {
  background: rgba(255, 255, 255, .210);
  border-radius: 999px;
  min-height: 30px;
  min-width: 7px;
}

.filter-menu-scroller scrollbar slider:hover {
  background: rgba(255, 255, 255, .300);
}

dropdown.filter-dropdown,
dropdown.filter-dropdown:backdrop {
  background-color: transparent;
  background-image: none;
  color: rgba(245, 247, 252, .90);
}

dropdown.filter-dropdown button,
dropdown.filter-dropdown button.toggle,
dropdown.filter-dropdown:backdrop button,
dropdown.filter-dropdown:backdrop button.toggle {
  background-color: rgba(255, 255, 255, .036);
  background-image:
    linear-gradient(to bottom, rgba(255, 255, 255, .074), rgba(255, 255, 255, .030));
  border: 1px solid rgba(255, 255, 255, .090);
  border-radius: 10px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .115),
    inset 1px 0 0 rgba(255, 255, 255, .045);
  color: rgba(245, 247, 252, .88);
  min-height: 34px;
  padding: 0 11px;
}

dropdown.filter-dropdown button:active,
dropdown.filter-dropdown button.toggle:active,
dropdown.filter-dropdown:hover button,
dropdown.filter-dropdown:hover button.toggle,
dropdown.filter-dropdown button:hover,
dropdown.filter-dropdown button.toggle:hover,
dropdown.filter-dropdown button:checked,
dropdown.filter-dropdown button.toggle:checked {
  background-color: rgba(255, 255, 255, .052);
  background-image:
    linear-gradient(to bottom, rgba(255, 255, 255, .095), rgba(255, 255, 255, .034));
  border-color: rgba(255, 255, 255, .130);
  color: #ffffff;
}

dropdown.filter-dropdown:focus button,
dropdown.filter-dropdown button:focus,
dropdown.filter-dropdown button:focus-visible {
  background-color: rgba(255, 255, 255, .052);
  background-image:
    linear-gradient(to bottom, rgba(255, 255, 255, .095), rgba(255, 255, 255, .034));
  border-color: rgba(255, 255, 255, .130);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .105);
}

.filter-dropdown button:active,
.filter-dropdown button.toggle:active,
.filter-dropdown button:checked,
.filter-dropdown button.toggle:checked,
.filter-dropdown button:focus,
.filter-dropdown button.toggle:focus,
.filter-dropdown button:focus-visible,
.filter-dropdown button.toggle:focus-visible {
  background-color: rgba(255, 255, 255, .052);
  background-image:
    linear-gradient(to bottom, rgba(255, 255, 255, .095), rgba(255, 255, 255, .034));
  border-color: rgba(255, 255, 255, .130);
  color: #ffffff;
}

dropdown.filter-dropdown arrow,
dropdown.filter-dropdown image {
  color: rgba(235, 238, 246, .58);
  -gtk-icon-size: 14px;
}

dropdown.filter-dropdown label {
  color: inherit;
  font-weight: 600;
}

popover.background,
popover.background:backdrop {
  background-color: transparent;
  background-image: none;
  border: none;
  box-shadow: none;
  outline-color: transparent;
  outline-width: 0;
  padding: 0;
}

popover.background contents,
popover.background > contents,
popover.background contents:backdrop,
popover.background:backdrop > contents {
  background-color: rgba(32, 31, 33, .98);
  background-image:
    linear-gradient(to bottom, rgba(42, 40, 41, .98), rgba(32, 31, 33, .98) 48%, rgba(22, 23, 27, .98));
  border: 1px solid rgba(255, 255, 255, .11);
  border-radius: 14px;
  box-shadow: 0 16px 34px rgba(0, 0, 0, .18);
  padding: 9px;
}

popover.background arrow {
  background-color: rgba(32, 31, 33, .98);
  border: 1px solid rgba(255, 255, 255, .11);
}

popover.background scrolledwindow,
popover.background viewport,
popover.background listview,
popover.background listview.view,
popover.background row {
  background-color: transparent;
  background-image: none;
  box-shadow: none;
}

popover.background row {
  border-radius: 10px;
  color: rgba(255, 255, 255, .96);
  font-weight: 700;
  min-height: 34px;
  padding: 0 9px;
}

popover.background row label {
  color: inherit;
}

popover.background row:hover,
popover.background row:selected {
  background-color: rgba(255, 255, 255, .055);
  background-image: none;
  color: #ffffff;
}

popover.background row:selected,
popover.background row:selected:hover {
  background-color: rgba(255, 255, 255, .038);
  background-image: none;
  color: #ffffff;
}

popover.background.workspace-popover,
popover.background.workspace-popover:backdrop {
  background: transparent;
  background-color: transparent;
  background-image: none;
  box-shadow: none;
  border: none;
  padding: 0;
}

popover.workspace-popover contents,
popover.workspace-popover > contents,
popover.workspace-popover.background contents,
popover.workspace-popover.background > contents,
popover.background.workspace-popover contents,
popover.background.workspace-popover > contents,
popover.background.workspace-popover contents:backdrop,
popover.background.workspace-popover:backdrop > contents {
  background: rgba(0, 0, 0, .12);
  background-color: rgba(0, 0, 0, .12);
  background-image: none;
  border: none;
  border-radius: 14px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, .10);
  padding: 9px;
}

popover.workspace-popover box,
popover.workspace-popover button,
popover.background.workspace-popover box,
popover.background.workspace-popover button {
  background-color: transparent;
  background-image: none;
  box-shadow: none;
}

popover.background.workspace-popover .workspace-menu {
  background-color: transparent;
  background-image: none;
}

popover.background.workspace-popover button.workspace-row,
popover.background.workspace-popover button.workspace-action,
popover.background.workspace-popover button.workspace-icon-button {
  background-color: transparent;
  background-image: none;
  box-shadow: none;
}

popover.background.workspace-popover button.workspace-row:hover,
popover.background.workspace-popover button.workspace-action:hover {
  background-color: rgba(255, 255, 255, .040);
  background-image: none;
}

popover.background.workspace-popover button.workspace-row.workspace-active {
  background-color: rgba(255, 255, 255, .025);
  background-image: none;
  box-shadow: none;
}

.filter-toggle {
  background:
    linear-gradient(to bottom, rgba(255, 255, 255, .070), rgba(255, 255, 255, .030)),
    rgba(255, 255, 255, .036);
  background-image:
    linear-gradient(to bottom, rgba(255, 255, 255, .070), rgba(255, 255, 255, .030));
  border: 1px solid rgba(255, 255, 255, .090);
  border-radius: 10px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .115),
    inset 1px 0 0 rgba(255, 255, 255, .045);
  color: rgba(235, 238, 246, .66);
  min-height: 34px;
  padding: 0 12px;
}

.filter-toggle:hover {
  background:
    linear-gradient(to bottom, rgba(255, 255, 255, .105), rgba(255, 255, 255, .045)),
    rgba(255, 255, 255, .060);
  background-image:
    linear-gradient(to bottom, rgba(255, 255, 255, .105), rgba(255, 255, 255, .045));
  border-color: rgba(255, 255, 255, .155);
  color: #ffffff;
}

.filter-toggle:checked {
  background:
    linear-gradient(to bottom, rgba(255, 111, 144, .22), rgba(255, 111, 144, .12)),
    rgba(255, 111, 144, .12);
  background-image:
    linear-gradient(to bottom, rgba(255, 111, 144, .22), rgba(255, 111, 144, .12));
  border-color: rgba(255, 111, 144, .48);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .14),
    0 0 18px rgba(255, 111, 144, .12);
  color: #ff6f90;
}

.table-header {
  background: rgba(9, 11, 22, .10);
  border-radius: 13px 13px 0 0;
  color: rgba(235, 238, 246, .58);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .04em;
  min-height: 38px;
  padding: 0 8px;
  text-transform: uppercase;
}

.table-header-cell {
  color: rgba(235, 238, 246, .58);
}

.data-row {
  background: transparent;
  border-bottom: 1px solid rgba(255, 255, 255, .026);
  color: rgba(245, 247, 252, .92);
  min-height: 46px;
  padding: 0 8px;
}

.table-scroller,
.table-scroller viewport,
.table-scroller listview {
  background: transparent;
  border-radius: 0 0 13px 13px;
}

.table-scroller undershoot {
  background: none;
}

.data-list,
.data-list row,
.data-list row:hover,
.data-list row:selected,
.data-list row:selected:hover,
.data-list row:focus,
.data-list row:selected:focus {
  background: transparent;
  box-shadow: none;
}

.data-row:hover {
  background: rgba(255, 255, 255, .075);
  border-radius: 10px;
}

.data-row.selected-data-row {
  background: rgba(255, 255, 255, .12);
  border-radius: 10px;
}

.sprite-frame {
  background: rgba(255, 255, 255, .05);
  border-radius: 10px;
  min-height: 40px;
  min-width: 40px;
}

.detail-sprite-frame {
  background:
    radial-gradient(120px 100px at 50% 48%, rgba(255, 255, 255, .08), transparent 70%),
    rgba(255, 255, 255, .05);
  border-radius: 14px;
  min-height: 150px;
  min-width: 150px;
}

.entity-icon-frame {
  background:
    radial-gradient(90px 74px at 50% 50%, rgba(255, 255, 255, .08), transparent 72%),
    rgba(255, 255, 255, .05);
  border-radius: 14px;
  min-height: 112px;
  min-width: 112px;
}

.dex-id,
.muted {
  color: rgba(235, 238, 246, .56);
}

.dex-id {
  font-family: monospace;
  font-size: 13px;
}

.row-title {
  font-weight: 700;
}

.detail-title {
  font-size: 28px;
  font-weight: 850;
}

.detail-id {
  color: rgba(235, 238, 246, .56);
  font-family: monospace;
}

.stat-hp { color: #ff4d55; }
.stat-atk { color: #ff8a22; }
.stat-def { color: #ffd21a; }
.stat-spa { color: #7772ff; }
.stat-spd { color: #20d179; }
.stat-spe { color: #f14aa0; }
.stat-bst { color: rgba(241, 244, 250, .86); }
.stat-value { color: rgba(241, 244, 250, .92); }
.stat-total-name {
  color: #ff6f90;
  font-weight: 800;
}

.stat-total-value {
  color: #ff6f90;
  font-weight: 800;
}

.type-pill {
  border-radius: 999px;
  color: white;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 10px;
  text-transform: uppercase;
}

.type-normal { background: #9da0aa; }
.type-fire { background: #ff8a37; }
.type-water { background: #3197e8; }
.type-electric { background: #ffd400; color: #161616; }
.type-grass { background: #31c854; }
.type-ice { background: #53d4d0; color: #172020; }
.type-fighting { background: #e4376b; }
.type-poison { background: #b96bd4; }
.type-ground { background: #e17132; }
.type-flying { background: #7fa5df; }
.type-psychic { background: #ff6174; }
.type-bug { background: #89c80d; }
.type-rock { background: #c8b678; color: #181818; }
.type-ghost { background: #5876bd; }
.type-dragon { background: #0d83d8; }
.type-dark { background: #5d586d; }
.type-steel { background: #6d9aab; }
.type-fairy { background: #e676d8; }

.type-text {
  background: transparent;
  border-radius: 0;
  font-size: 11px;
  font-weight: 850;
  padding: 0;
  text-transform: uppercase;
}

.type-text-normal { color: #b8bcc6; }
.type-text-fire { color: #ff9a4d; }
.type-text-water { color: #4aa8ff; }
.type-text-electric { color: #ffe047; }
.type-text-grass { color: #43dc68; }
.type-text-ice { color: #66e3df; }
.type-text-fighting { color: #ff4c83; }
.type-text-poison { color: #cd81e6; }
.type-text-ground { color: #f08a48; }
.type-text-flying { color: #96b9ee; }
.type-text-psychic { color: #ff7686; }
.type-text-bug { color: #9cdc20; }
.type-text-rock { color: #d9c986; }
.type-text-ghost { color: #6f8ed5; }
.type-text-dragon { color: #1e9af0; }
.type-text-dark { color: #817b91; }
.type-text-steel { color: #82afbf; }
.type-text-fairy { color: #f189e7; }

.type-choice {
  background: transparent;
  border-radius: 999px;
  box-shadow: none;
  margin: 0;
  padding: 0;
}

.type-choice:hover {
  background: transparent;
  box-shadow: none;
}

.type-flow flowboxchild,
.type-flow flowboxchild:hover,
.type-flow flowboxchild:selected {
  background: transparent;
  border-radius: 0;
  padding: 0;
}

.chart-grid {
  padding: 10px;
}

.chart-axis {
  border-radius: 7px;
  min-height: 26px;
  transition: background 140ms ease, box-shadow 140ms ease, opacity 140ms ease, color 140ms ease;
}

.chart-axis:hover {
  background: rgba(255, 111, 144, .08);
}

.chart-cell {
  border-radius: 7px;
  font-weight: 800;
  min-height: 26px;
  min-width: 34px;
  transition: background 140ms ease, box-shadow 140ms ease, opacity 140ms ease, color 140ms ease;
}

.chart-cell:hover {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .24);
}

.chart-focus {
  color: #ffffff;
}

.chart-super {
  background: rgba(239, 68, 68, .16);
  color: #ff6471;
}

.chart-resist {
  background: rgba(34, 197, 94, .12);
  color: #22d685;
}

.chart-immune {
  background: rgba(255, 255, 255, .035);
  color: rgba(235, 238, 246, .42);
}

.chart-axis.chart-selected-axis {
  background: rgba(255, 111, 144, .12);
  box-shadow:
    inset 0 0 0 1px rgba(255, 111, 144, .46),
    0 0 14px rgba(255, 111, 144, .10);
  color: #ffffff;
}

.chart-axis.chart-partial-axis {
  background: rgba(255, 111, 144, .07);
  box-shadow: inset 0 0 0 1px rgba(255, 111, 144, .28);
  color: #ffffff;
}

.chart-axis.chart-pinned-axis {
  background: rgba(102, 227, 223, .08);
  box-shadow: inset 0 0 0 1px rgba(102, 227, 223, .34);
  color: #ffffff;
}

.chart-axis.chart-cell-axis {
  background: rgba(102, 227, 223, .055);
  box-shadow: inset 0 0 0 1px rgba(102, 227, 223, .20);
  color: #ffffff;
}

.chart-cell.chart-selected-axis {
  background-image: linear-gradient(rgba(255, 111, 144, .045), rgba(255, 111, 144, .045));
  box-shadow: none;
}

.chart-cell.chart-pinned-axis {
  background-image: linear-gradient(rgba(102, 227, 223, .06), rgba(102, 227, 223, .06));
  box-shadow: none;
}

.chart-cell.chart-selected-intersection {
  background-image: linear-gradient(rgba(255, 111, 144, .16), rgba(255, 111, 144, .16));
  box-shadow:
    inset 0 0 0 2px rgba(255, 111, 144, .72),
    0 0 16px rgba(255, 111, 144, .16);
  color: #ffffff;
}

.chart-muted {
  opacity: .38;
}

.metric-pill {
  background: rgba(255, 255, 255, .06);
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 999px;
  color: rgba(235, 238, 246, .72);
  padding: 5px 11px;
}

.ability-card {
  background: rgba(255, 255, 255, .035);
  border: 1px solid rgba(255, 255, 255, .055);
  border-radius: 12px;
  padding: 14px;
}

.clickable-card:hover,
.data-row:hover,
.nav-row:hover {
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
}

.page,
.detail-wrap {
  animation: fade-slide 180ms ease-out;
}

@keyframes fade-slide {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-title {
  font-size: 17px;
  font-weight: 800;
}

.section-title-underline {
  border-bottom: 2px solid #ff6f90;
  padding-bottom: 2px;
}

.game-banner {
  background: rgba(255, 103, 132, .10);
  border: 1px solid rgba(255, 103, 132, .22);
  border-radius: 12px;
  padding: 8px 12px;
}

.stat-row {
  min-height: 32px;
}

.stat-drawn-bar {
  min-height: 12px;
}

progressbar.stat-bar {
  min-height: 12px;
}

progressbar.stat-bar trough {
  background-color: rgba(255, 255, 255, .07);
  background-image: none;
  border: none;
  border-radius: 999px;
  box-shadow: none;
  min-height: 12px;
}

progressbar.stat-bar progress {
  background-image: none;
  border: none;
  border-radius: 999px;
  box-shadow: none;
  min-height: 12px;
}

progressbar.stat-progress-hp progress,
progressbar.stat-progress-hp > trough > progress {
  background-color: #ef4444;
  background-image: none;
  color: #ef4444;
}

progressbar.stat-progress-atk progress,
progressbar.stat-progress-atk > trough > progress {
  background-color: #f97316;
  background-image: none;
  color: #f97316;
}

progressbar.stat-progress-def progress,
progressbar.stat-progress-def > trough > progress {
  background-color: #eab308;
  background-image: none;
  color: #eab308;
}

progressbar.stat-progress-spa progress,
progressbar.stat-progress-spa > trough > progress {
  background-color: #6366f1;
  background-image: none;
  color: #6366f1;
}

progressbar.stat-progress-spd progress,
progressbar.stat-progress-spd > trough > progress {
  background-color: #22c55e;
  background-image: none;
  color: #22c55e;
}

progressbar.stat-progress-spe progress,
progressbar.stat-progress-spe > trough > progress {
  background-color: #ec4899;
  background-image: none;
  color: #ec4899;
}

.matchup-row {
  border-radius: 10px;
  padding: 8px 10px;
}

.matchup-bad { background: rgba(239, 68, 68, .12); }
.matchup-good { background: rgba(34, 197, 94, .10); }
.matchup-neutral { background: rgba(255, 255, 255, .055); }

.evo-card,
.pokemon-chip {
  background: rgba(255, 255, 255, .065);
  border: 1px solid rgba(255, 255, 255, .07);
  border-radius: 12px;
  padding: 8px;
}

.pokemon-chip.compact {
  padding: 6px 8px;
}

.compare-empty {
  padding: 22px;
}

.evo-stage {
  padding: 0 2px;
}

.evo-form-card {
  border-style: dashed;
  border-color: rgba(142, 93, 221, .55);
}

.evo-branches {
  padding-left: 2px;
}

.evo-branch-row {
  min-height: 106px;
}

.evo-card.current {
  border-color: rgba(255, 103, 132, .55);
  box-shadow: 0 0 0 1px rgba(255, 103, 132, .20);
}

.move-method {
  background: rgba(255, 255, 255, .075);
  border-radius: 10px;
  color: rgba(245, 247, 252, .90);
  font-weight: 700;
  padding: 8px 12px;
}

.move-tabs {
  background: rgba(9, 11, 22, .20);
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 12px;
  padding: 3px;
}

.move-tab {
  border-radius: 9px;
  font-weight: 700;
  min-height: 32px;
  padding: 0 16px;
}

.move-tab:checked {
  background: rgba(255, 255, 255, .13);
  color: rgba(245, 247, 252, .96);
}

.settings-row {
  border-top: 1px solid rgba(255, 255, 255, .06);
  min-height: 32px;
  padding: 7px 4px;
}

.settings-card {
  padding: 14px;
}

.settings-card .section-title {
  font-size: 16px;
}

.settings-choice {
  border-radius: 999px;
  padding: 5px 12px;
}

.settings-flow-card {
  min-width: 330px;
}
"#;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
enum Page {
    Pokedex,
    Moves,
    Abilities,
    Items,
    Natures,
    Types,
    Compare,
    Settings,
}

impl Page {
    fn stack_name(self) -> &'static str {
        match self {
            Self::Pokedex => "pokedex",
            Self::Moves => "moves",
            Self::Abilities => "abilities",
            Self::Items => "items",
            Self::Natures => "natures",
            Self::Types => "types",
            Self::Compare => "compare",
            Self::Settings => "settings",
        }
    }

    fn search_placeholder(self) -> &'static str {
        match self {
            Self::Pokedex => "Search Pokemon...",
            Self::Moves => "Search moves...",
            Self::Abilities => "Search abilities...",
            Self::Items => "Search items...",
            Self::Natures => "Search natures...",
            Self::Types | Self::Compare | Self::Settings => "Search Pokemon, moves, items...",
        }
    }

    fn from_key(value: &str) -> Option<Self> {
        match value {
            "pokedex" => Some(Self::Pokedex),
            "moves" => Some(Self::Moves),
            "abilities" => Some(Self::Abilities),
            "items" => Some(Self::Items),
            "natures" => Some(Self::Natures),
            "types" => Some(Self::Types),
            "compare" => Some(Self::Compare),
            "settings" => Some(Self::Settings),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
enum TabTarget {
    Pokemon(i64),
    Move(i64),
    Ability(i64),
    Item(i64),
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
enum ViewState {
    Home(Page),
    Target(TabTarget),
}

#[derive(Clone)]
struct OpenTab {
    page: adw::TabPage,
    target: TabTarget,
}

#[derive(Clone)]
struct NavigationHistory {
    current: Option<ViewState>,
    back: Vec<ViewState>,
    forward: Vec<ViewState>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct WorkspaceStore {
    active_id: String,
    next_id: u64,
    workspaces: Vec<Workspace>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Workspace {
    id: String,
    name: String,
    #[serde(default)]
    snapshot: WorkspaceSnapshot,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct WorkspaceSnapshot {
    #[serde(default = "default_workspace_page")]
    current_page: Page,
    #[serde(default = "default_workspace_view_state")]
    active: ViewState,
    #[serde(default)]
    tabs: Vec<TabTarget>,
    #[serde(default)]
    search_query: String,
    #[serde(default)]
    filters: WorkspaceFilters,
    #[serde(default)]
    compare_ids: Vec<i64>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
struct WorkspaceFilters {
    #[serde(default)]
    pokedex_type: u32,
    #[serde(default)]
    pokedex_second_type: u32,
    #[serde(default)]
    pokedex_generation: u32,
    #[serde(default)]
    pokedex_sort: Vec<u32>,
    #[serde(default)]
    pokedex_favorites: bool,
    #[serde(default)]
    move_type: u32,
    #[serde(default)]
    move_class: u32,
    #[serde(default)]
    move_min_power: u32,
    #[serde(default)]
    move_max_power: u32,
    #[serde(default)]
    ability_generation: u32,
    #[serde(default)]
    item_category: u32,
    #[serde(default)]
    nature_stat: u32,
}

mod workspace_panel {
    use gtk::glib;
    use gtk::prelude::*;
    use gtk::subclass::prelude::*;

    #[derive(Default)]
    pub struct WorkspacePanel;

    #[glib::object_subclass]
    impl ObjectSubclass for WorkspacePanel {
        const NAME: &'static str = "PokediaWorkspacePanel";
        type Type = super::WorkspacePanel;
        type ParentType = gtk::Box;
    }

    impl ObjectImpl for WorkspacePanel {}

    impl WidgetImpl for WorkspacePanel {
        fn snapshot(&self, snapshot: &gtk::Snapshot) {
            let widget = self.obj();
            let width = widget.width() as f32;
            let height = widget.height() as f32;

            if width > 0.0 && height > 0.0 {
                let bounds = gtk::graphene::Rect::new(0.0, 0.0, width, height);
                let rounded = gtk::gsk::RoundedRect::from_rect(bounds, 14.0);

                snapshot.push_rounded_clip(&rounded);
                snapshot.append_linear_gradient(
                    &bounds,
                    &gtk::graphene::Point::new(0.0, 0.0),
                    &gtk::graphene::Point::new(0.0, height),
                    &[
                        gtk::gsk::ColorStop::new(
                            0.0,
                            gtk::gdk::RGBA::new(0.165, 0.158, 0.160, 0.98),
                        ),
                        gtk::gsk::ColorStop::new(
                            0.48,
                            gtk::gdk::RGBA::new(0.125, 0.122, 0.130, 0.98),
                        ),
                        gtk::gsk::ColorStop::new(
                            1.0,
                            gtk::gdk::RGBA::new(0.085, 0.090, 0.105, 0.98),
                        ),
                    ],
                );

                snapshot.pop();
            }

            self.parent_snapshot(snapshot);

            if width > 0.0 && height > 0.0 {
                let border_bounds = gtk::graphene::Rect::new(0.5, 0.5, width - 1.0, height - 1.0);
                let border = gtk::gsk::RoundedRect::from_rect(border_bounds, 13.5);
                let border_color = gtk::gdk::RGBA::new(1.0, 1.0, 1.0, 0.11);
                snapshot.append_border(
                    &border,
                    &[1.0, 1.0, 1.0, 1.0],
                    &[border_color, border_color, border_color, border_color],
                );
            }
        }
    }

    impl BoxImpl for WorkspacePanel {}
}

glib::wrapper! {
    pub struct WorkspacePanel(ObjectSubclass<workspace_panel::WorkspacePanel>)
        @extends gtk::Widget, gtk::Box,
        @implements gtk::Accessible, gtk::Buildable, gtk::ConstraintTarget, gtk::Orientable;
}

impl WorkspacePanel {
    fn new() -> Self {
        let panel: Self = glib::Object::new();
        panel.set_orientation(gtk::Orientation::Vertical);
        panel.set_spacing(0);
        panel.set_margin_start(WORKSPACE_MENU_OFFSET_X);
        panel.set_margin_top(WORKSPACE_MENU_OFFSET_Y);
        panel
    }
}

impl FilterDropdown {
    fn new(options: Vec<String>) -> Self {
        let options = Rc::new(options);
        let button = gtk::Button::new();
        button.add_css_class("filter-dropdown");
        button.set_valign(gtk::Align::Center);

        let content = gtk::Box::new(gtk::Orientation::Horizontal, 8);
        content.set_valign(gtk::Align::Center);
        let label = gtk::Label::new(None);
        label.set_xalign(0.0);
        label.set_hexpand(true);
        label.set_ellipsize(gtk::pango::EllipsizeMode::End);
        let arrow = gtk::Image::from_icon_name("pan-down-symbolic");
        arrow.set_pixel_size(12);
        content.append(&label);
        content.append(&arrow);
        button.set_child(Some(&content));

        let panel = WorkspacePanel::new();
        panel.set_halign(gtk::Align::Start);
        panel.set_valign(gtk::Align::Start);
        panel.set_visible(false);

        let menu = gtk::Box::new(gtk::Orientation::Vertical, 4);
        menu.add_css_class("workspace-menu");
        menu.add_css_class("filter-menu");
        let scroller = gtk::ScrolledWindow::builder()
            .hscrollbar_policy(gtk::PolicyType::Never)
            .vscrollbar_policy(gtk::PolicyType::Automatic)
            .max_content_height(FILTER_DROPDOWN_MAX_HEIGHT)
            .propagate_natural_height(true)
            .child(&menu)
            .build();
        scroller.add_css_class("filter-menu-scroller");
        panel.append(&scroller);

        let dropdown = Self {
            button,
            label,
            panel,
            menu,
            options,
            selected: Rc::new(Cell::new(0)),
            row_states: Rc::new(RefCell::new(Vec::new())),
            handlers: Rc::new(RefCell::new(Vec::new())),
        };
        dropdown.build_rows();
        dropdown.refresh();
        dropdown
    }

    fn widget(&self) -> &gtk::Button {
        &self.button
    }

    fn selected(&self) -> u32 {
        self.selected.get()
    }

    fn set_selected(&self, selected: u32) {
        let selected = if selected == gtk::INVALID_LIST_POSITION {
            0
        } else {
            selected.min(self.options.len().saturating_sub(1) as u32)
        };
        if self.selected.replace(selected) == selected {
            self.refresh();
            return;
        }
        self.refresh();
        for handler in self.handlers.borrow().iter() {
            handler(self);
        }
    }

    fn set_visible(&self, visible: bool) {
        self.button.set_visible(visible);
        if !visible {
            self.hide_menu();
        }
    }

    fn is_visible(&self) -> bool {
        self.button.is_visible()
    }

    fn connect_selected_notify<F: Fn(&FilterDropdown) + 'static>(&self, f: F) {
        self.handlers.borrow_mut().push(Box::new(f));
    }

    fn hide_menu(&self) {
        self.panel.set_visible(false);
        self.button.remove_css_class("filter-open");
    }

    fn show_menu(&self, overlay: &gtk::Overlay) {
        if let Some(bounds) = self.button.compute_bounds(overlay) {
            let x = bounds.x().round().max(0.0) as i32;
            let y = (bounds.y() + bounds.height() + 6.0).round().max(0.0) as i32;
            self.panel.set_margin_start(x);
            self.panel.set_margin_top(y);
            self.panel
                .set_width_request(self.button.width().max(FILTER_DROPDOWN_MIN_WIDTH));
        }
        self.panel.set_visible(true);
        self.button.add_css_class("filter-open");
    }

    fn build_rows(&self) {
        for (idx, option) in self.options.iter().enumerate() {
            let row = gtk::Button::new();
            row.add_css_class("workspace-row");
            row.set_has_frame(false);
            row.set_halign(gtk::Align::Fill);
            row.set_hexpand(true);

            let layout = gtk::Box::new(gtk::Orientation::Horizontal, 9);
            let check = gtk::Image::from_icon_name("object-select-symbolic");
            check.set_pixel_size(13);
            let label = gtk::Label::new(Some(option));
            label.set_xalign(0.0);
            label.set_hexpand(true);
            label.set_ellipsize(gtk::pango::EllipsizeMode::End);
            layout.append(&check);
            layout.append(&label);
            row.set_child(Some(&layout));

            let dropdown = self.clone();
            row.connect_clicked(move |_| {
                dropdown.set_selected(idx as u32);
                dropdown.hide_menu();
            });

            self.menu.append(&row);
            self.row_states.borrow_mut().push((row, check));
        }
    }

    fn refresh(&self) {
        let selected = self.selected.get() as usize;
        let label = self
            .options
            .get(selected)
            .or_else(|| self.options.first())
            .map(String::as_str)
            .unwrap_or("");
        self.label.set_text(label);
        self.button.set_tooltip_text(Some(label));

        for (idx, (row, check)) in self.row_states.borrow().iter().enumerate() {
            let active = idx == selected;
            if active {
                row.add_css_class("workspace-active");
            } else {
                row.remove_css_class("workspace-active");
            }
            check.set_opacity(if active { 1.0 } else { 0.0 });
        }
    }
}

#[derive(Clone)]
struct WorkspaceUi {
    button: gtk::Button,
    label: gtk::Label,
    panel: WorkspacePanel,
    menu: gtk::Box,
    store: Rc<RefCell<WorkspaceStore>>,
    suppress_autosave: Rc<Cell<bool>>,
}

impl Default for WorkspaceStore {
    fn default() -> Self {
        Self {
            active_id: "default".to_owned(),
            next_id: 2,
            workspaces: vec![Workspace {
                id: "default".to_owned(),
                name: "Default".to_owned(),
                snapshot: WorkspaceSnapshot::default(),
            }],
        }
    }
}

impl Default for WorkspaceSnapshot {
    fn default() -> Self {
        Self {
            current_page: default_workspace_page(),
            active: default_workspace_view_state(),
            tabs: Vec::new(),
            search_query: String::new(),
            filters: WorkspaceFilters::default(),
            compare_ids: Vec::new(),
        }
    }
}

fn default_workspace_page() -> Page {
    Page::Pokedex
}

fn default_workspace_view_state() -> ViewState {
    ViewState::Home(Page::Pokedex)
}

#[derive(Clone)]
struct LoadedData {
    pokemon: Rc<Vec<PokemonSummary>>,
    moves: Rc<Vec<MoveSummary>>,
    abilities: Rc<Vec<AbilitySummary>>,
    items: Rc<Vec<ItemSummary>>,
    natures: Rc<Vec<NatureSummary>>,
    games: Rc<Vec<GameSummary>>,
    sync_resources: Rc<Vec<SyncResourceStatus>>,
    favorites: Rc<HashSet<i64>>,
    selected_game: Option<GameSummary>,
}

#[derive(Clone)]
struct AppWidgets {
    stack: gtk::Stack,
    tab_view: adw::TabView,
    home_tab: adw::TabPage,
    open_tabs: Rc<RefCell<Vec<OpenTab>>>,
    history: Rc<RefCell<NavigationHistory>>,
    applying_history: Rc<Cell<bool>>,
    nav_rows: Rc<Vec<(Page, gtk::ListBoxRow)>>,
    search: gtk::SearchEntry,
    workspace: WorkspaceUi,
    toast_overlay: adw::ToastOverlay,
    current_page: Rc<RefCell<Page>>,
    pokemon_model: gtk::StringList,
    move_model: gtk::StringList,
    item_model: gtk::StringList,
    nature_model: gtk::StringList,
    ability_flow: gtk::FlowBox,
    filtered_pokemon: Rc<RefCell<Vec<PokemonSummary>>>,
    filtered_moves: Rc<RefCell<Vec<MoveSummary>>>,
    filtered_abilities: Rc<RefCell<Vec<AbilitySummary>>>,
    filtered_items: Rc<RefCell<Vec<ItemSummary>>>,
    pokemon_count: gtk::Label,
    move_count: gtk::Label,
    ability_count: gtk::Label,
    item_count: gtk::Label,
    nature_count: gtk::Label,
    favorite_ids: Rc<HashSet<i64>>,
    pokedex_filters: PokedexFilterWidgets,
    move_filters: MoveFilterWidgets,
    ability_filters: AbilityFilterWidgets,
    item_filters: ItemFilterWidgets,
    nature_filters: NatureFilterWidgets,
    compare: CompareWidgets,
    compare_ids: Rc<RefCell<Vec<i64>>>,
    compare_badge: gtk::Label,
    detail: DetailWidgets,
    move_detail: EntityDetailWidgets,
    ability_detail: EntityDetailWidgets,
    item_detail: EntityDetailWidgets,
    sprite_loader: SpriteLoader,
}

#[derive(Clone)]
struct PokedexFilterWidgets {
    type_filter: FilterDropdown,
    second_type_filter: FilterDropdown,
    generation_filter: FilterDropdown,
    sort_filters: Vec<FilterDropdown>,
    favorites_filter: gtk::ToggleButton,
}

#[derive(Clone)]
struct MoveFilterWidgets {
    type_filter: FilterDropdown,
    class_filter: FilterDropdown,
    min_power_filter: FilterDropdown,
    max_power_filter: FilterDropdown,
}

#[derive(Clone)]
struct AbilityFilterWidgets {
    generation_filter: FilterDropdown,
    generations: Rc<Vec<i64>>,
}

#[derive(Clone)]
struct ItemFilterWidgets {
    category_filter: FilterDropdown,
    categories: Rc<Vec<String>>,
}

#[derive(Clone)]
struct NatureFilterWidgets {
    stat_filter: FilterDropdown,
}

type FilterDropdownHandler = Box<dyn Fn(&FilterDropdown)>;

#[derive(Clone)]
struct FilterDropdown {
    button: gtk::Button,
    label: gtk::Label,
    panel: WorkspacePanel,
    menu: gtk::Box,
    options: Rc<Vec<String>>,
    selected: Rc<Cell<u32>>,
    row_states: Rc<RefCell<Vec<(gtk::Button, gtk::Image)>>>,
    handlers: Rc<RefCell<Vec<FilterDropdownHandler>>>,
}

#[derive(Clone)]
struct CompareWidgets {
    title: gtk::Label,
    selected: gtk::Box,
    panel: adw::Bin,
}

#[derive(Clone)]
struct StatMeter {
    area: gtk::DrawingArea,
    fraction: Rc<Cell<f64>>,
}

impl StatMeter {
    fn new(color: &str) -> Self {
        let area = gtk::DrawingArea::new();
        area.add_css_class("stat-drawn-bar");
        area.set_content_height(12);
        area.set_height_request(12);
        area.set_hexpand(true);
        area.set_valign(gtk::Align::Center);

        let fraction = Rc::new(Cell::new(0.0));
        let draw_fraction = fraction.clone();
        let (red, green, blue) = parse_hex_color(color);
        area.set_draw_func(move |_, cr, width, height| {
            draw_stat_meter(cr, width, height, draw_fraction.get(), red, green, blue);
        });

        Self { area, fraction }
    }

    fn widget(&self) -> &gtk::DrawingArea {
        &self.area
    }

    fn set_fraction(&self, fraction: f64) {
        self.fraction.set(fraction.clamp(0.0, 1.0));
        self.area.queue_draw();
    }
}

#[derive(Clone)]
struct DetailWidgets {
    scroller: gtk::ScrolledWindow,
    sprite: gtk::Image,
    title: gtk::Label,
    id: gtk::Label,
    types: gtk::Box,
    description: gtk::Label,
    metrics: gtk::Box,
    stats: Vec<(gtk::Label, Option<StatMeter>)>,
    abilities: gtk::Box,
    game_banner: gtk::Box,
    game_label: gtk::Label,
    locations_section: gtk::Box,
    locations: gtk::Box,
    stats_section: gtk::Box,
    matchups_section: gtk::Box,
    matchups: gtk::Box,
    evolution_section: gtk::Box,
    evolution: gtk::Box,
    moves_section: gtk::Box,
    moves: gtk::Box,
}

#[derive(Clone)]
struct EntityDetailWidgets {
    scroller: gtk::ScrolledWindow,
    icon: gtk::Image,
    title: gtk::Label,
    id: gtk::Label,
    types: gtk::Box,
    metrics: gtk::Box,
    description: gtk::Label,
    related_title: gtk::Label,
    related: gtk::Box,
}

#[derive(Clone)]
struct SpriteLoader {
    registry: Rc<RefCell<HashMap<String, Vec<glib::WeakRef<gtk::Image>>>>>,
    pending: Rc<RefCell<HashSet<String>>>,
    sender: mpsc::Sender<SpriteLoadResult>,
}

struct SpriteLoadResult {
    key: String,
    path: Option<PathBuf>,
}

impl SpriteLoader {
    fn new() -> (Self, mpsc::Receiver<SpriteLoadResult>) {
        let (sender, receiver) = mpsc::channel();
        (
            Self {
                registry: Rc::new(RefCell::new(HashMap::new())),
                pending: Rc::new(RefCell::new(HashSet::new())),
                sender,
            },
            receiver,
        )
    }
}

fn start_sprite_result_pump(loader: SpriteLoader, receiver: mpsc::Receiver<SpriteLoadResult>) {
    glib::timeout_add_local(Duration::from_millis(80), move || {
        while let Ok(result) = receiver.try_recv() {
            loader.pending.borrow_mut().remove(&result.key);

            let Some(images) = loader.registry.borrow_mut().remove(&result.key) else {
                continue;
            };
            let Some(path) = result.path.as_ref() else {
                continue;
            };

            for weak_image in images {
                let Some(image) = weak_image.upgrade() else {
                    continue;
                };
                if image.widget_name().as_str() == result.key {
                    image.set_from_file(Some(path));
                }
            }
        }

        glib::ControlFlow::Continue
    });
}

fn load_sprite(
    loader: &SpriteLoader,
    image: &gtk::Image,
    sprite_url: Option<&str>,
    pixel_size: i32,
) {
    image.set_pixel_size(pixel_size);

    let Some(sprite_url) = sprite_url.filter(|value| !value.is_empty()) else {
        image.set_widget_name("");
        image.set_icon_name(Some("image-x-generic-symbolic"));
        return;
    };

    let key = sprite_cache_key(sprite_url);
    image.set_widget_name(&key);
    let path = sprite_cache_path(sprite_url);

    if path.exists() {
        image.set_from_file(Some(&path));
        return;
    }

    image.set_icon_name(Some("image-x-generic-symbolic"));
    loader
        .registry
        .borrow_mut()
        .entry(key.clone())
        .or_default()
        .push(image.downgrade());

    if !loader.pending.borrow_mut().insert(key.clone()) {
        return;
    }

    let url = sprite_url.to_owned();
    let sender = loader.sender.clone();
    thread::spawn(move || {
        let path = if download_sprite(&url, &path).is_ok() {
            Some(path)
        } else {
            None
        };
        let _ = sender.send(SpriteLoadResult { key, path });
    });
}

fn download_sprite(url: &str, path: &Path) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(12))
        .build()?;
    let bytes = client.get(url).send()?.error_for_status()?.bytes()?;
    let tmp_path = path.with_extension("tmp");
    fs::write(&tmp_path, bytes)?;
    fs::rename(tmp_path, path)?;
    Ok(())
}

fn sprite_cache_path(url: &str) -> PathBuf {
    native::app_data_dir()
        .join("sprites")
        .join(sprite_cache_key(url))
}

fn sprite_cache_key(url: &str) -> String {
    url.rsplit('/')
        .next()
        .filter(|value| !value.is_empty())
        .unwrap_or("sprite.png")
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '.' {
                ch
            } else {
                '_'
            }
        })
        .collect()
}

fn pokemon_sprite_url(pokemon_id: i64, explicit: Option<&str>) -> String {
    explicit
        .filter(|url| !url.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| {
            format!("https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{pokemon_id}.png")
        })
}

fn main() -> glib::ExitCode {
    adw::init().expect("failed to initialize libadwaita");
    let app = adw::Application::builder().application_id(APP_ID).build();
    app.connect_activate(build_ui);
    app.run()
}

fn build_ui(app: &adw::Application) {
    install_css();
    adw::StyleManager::default().set_color_scheme(adw::ColorScheme::ForceDark);

    let runtime = tokio::runtime::Runtime::new().expect("failed to create Tokio runtime");
    let load_result = runtime.block_on(async {
        let pool = native::init_pool().await?;
        let pokemon = native::load_pokemon_summaries(&pool).await?;
        let moves = native::load_move_summaries(&pool).await?;
        let abilities = native::load_ability_summaries(&pool).await?;
        let items = native::load_item_summaries(&pool).await?;
        let natures = native::load_nature_summaries(&pool).await?;
        let games = native::load_game_summaries(&pool).await?;
        let sync_resources = native::load_sync_resources(&pool).await?;
        let favorites = native::load_favorite_ids(&pool).await.unwrap_or_default();
        Ok::<_, Box<dyn std::error::Error>>((
            pool,
            pokemon,
            moves,
            abilities,
            items,
            natures,
            games,
            sync_resources,
            favorites,
        ))
    });

    let (pool, pokemon, moves, abilities, items, natures, games, sync_resources, favorites) =
        match load_result {
            Ok(data) => data,
            Err(error) => {
                show_startup_error(app, &error.to_string());
                return;
            }
        };

    let selected_game = games
        .iter()
        .find(|game| game.id == "runbun")
        .or_else(|| games.first())
        .cloned();
    let data = LoadedData {
        pokemon: Rc::new(pokemon),
        moves: Rc::new(moves),
        abilities: Rc::new(abilities),
        items: Rc::new(items),
        natures: Rc::new(natures),
        games: Rc::new(games),
        sync_resources: Rc::new(sync_resources),
        favorites: Rc::new(favorites.into_iter().collect()),
        selected_game,
    };
    let pool = Rc::new(pool);
    let runtime = Rc::new(runtime);
    let current_page = Rc::new(RefCell::new(Page::Pokedex));
    let filtered_pokemon = Rc::new(RefCell::new(Vec::new()));
    let filtered_moves = Rc::new(RefCell::new(Vec::new()));
    let filtered_abilities = Rc::new(RefCell::new(Vec::new()));
    let filtered_items = Rc::new(RefCell::new(Vec::new()));
    let (sprite_loader, sprite_receiver) = SpriteLoader::new();
    start_sprite_result_pump(sprite_loader.clone(), sprite_receiver);

    let window = adw::ApplicationWindow::builder()
        .application(app)
        .title("Pokedia")
        .default_width(1100)
        .default_height(720)
        .width_request(320)
        .height_request(300)
        .build();
    window.add_css_class("pokedia-window");
    window.set_opacity(ACTIVE_WINDOW_OPACITY);
    window.connect_is_active_notify(|window| {
        window.set_opacity(if window.is_active() {
            ACTIVE_WINDOW_OPACITY
        } else {
            1.0
        });
    });

    let search = gtk::SearchEntry::builder()
        .placeholder_text(Page::Pokedex.search_placeholder())
        .width_request(160)
        .hexpand(true)
        .build();
    search.add_css_class("app-search");

    let workspace = build_workspace_switcher(Rc::new(RefCell::new(load_workspace_store())));
    let header = build_header(&search, &workspace.button);

    let pokemon_model = gtk::StringList::new(&[]);
    let move_model = gtk::StringList::new(&[]);
    let item_model = gtk::StringList::new(&[]);
    let nature_model = gtk::StringList::new(&[]);
    let compare_ids = Rc::new(RefCell::new(startup_compare_ids()));
    let (sidebar, nav_rows, compare_badge) = build_sidebar();

    let (pokedex_page, pokemon_count, pokedex_filters) = build_pokedex_page(
        &pokemon_model,
        &sprite_loader,
        compare_ids.clone(),
        compare_badge.clone(),
    );
    let (moves_page, move_count, move_filters) = build_moves_page(&move_model);
    let (abilities_page, ability_flow, ability_count, ability_filters) =
        build_abilities_page(&data.abilities);
    let (items_page, item_count, item_filters) = build_items_page(&item_model, &data.items);
    let (natures_page, nature_count, nature_filters) = build_natures_page(&nature_model);
    let types_page = build_types_page();
    let (compare_page, compare) = build_compare_page();
    let settings_page = build_settings_page(&data);
    let (detail_page, detail) = build_detail_page();
    let (move_detail_page, move_detail) =
        build_entity_detail_page("Move", "media-playlist-shuffle-symbolic");
    let (ability_detail_page, ability_detail) =
        build_entity_detail_page("Ability", "starred-symbolic");
    let (item_detail_page, item_detail) =
        build_entity_detail_page("Item", "package-x-generic-symbolic");

    let stack = gtk::Stack::new();
    stack.set_hexpand(true);
    stack.set_vexpand(true);
    stack.set_hhomogeneous(false);
    stack.set_vhomogeneous(false);
    stack.set_transition_type(gtk::StackTransitionType::Crossfade);
    stack.set_transition_duration(160);
    stack.add_named(&pokedex_page, Some(Page::Pokedex.stack_name()));
    stack.add_named(&moves_page, Some(Page::Moves.stack_name()));
    stack.add_named(&abilities_page, Some(Page::Abilities.stack_name()));
    stack.add_named(&items_page, Some(Page::Items.stack_name()));
    stack.add_named(&natures_page, Some(Page::Natures.stack_name()));
    stack.add_named(&types_page, Some(Page::Types.stack_name()));
    stack.add_named(&compare_page, Some(Page::Compare.stack_name()));
    stack.add_named(&settings_page, Some(Page::Settings.stack_name()));
    stack.add_named(&detail_page, Some("detail"));
    stack.add_named(&move_detail_page, Some("move-detail"));
    stack.add_named(&ability_detail_page, Some("ability-detail"));
    stack.add_named(&item_detail_page, Some("item-detail"));
    stack.set_visible_child_name(Page::Pokedex.stack_name());

    let shell = gtk::Box::new(gtk::Orientation::Horizontal, 0);
    shell.set_margin_start(4);
    shell.set_margin_end(10);
    shell.set_margin_bottom(10);
    shell.append(&sidebar);
    shell.append(&stack);

    let tab_view = adw::TabView::new();
    let home_host = adw::Bin::new();
    let home_tab = tab_view.append_pinned(&home_host);
    home_tab.set_title("Home");
    home_tab.set_tooltip("Home");
    let home_icon = gtk::gio::ThemedIcon::new("go-home-symbolic");
    home_tab.set_icon(Some(&home_icon));
    let open_tabs: Rc<RefCell<Vec<OpenTab>>> = Rc::new(RefCell::new(Vec::new()));
    let startup_detail_id = std::env::var("POKEDIA_START_POKEMON_ID")
        .ok()
        .and_then(|value| value.parse::<i64>().ok());

    let tab_bar = adw::TabBar::new();
    tab_bar.add_css_class("app-tabbar");
    tab_bar.set_autohide(false);
    tab_bar.set_expand_tabs(false);
    tab_bar.set_view(Some(&tab_view));

    let root = adw::ToolbarView::new();
    root.add_css_class("pokedia-root");
    root.set_top_bar_style(adw::ToolbarStyle::Flat);
    root.add_top_bar(&header);
    root.add_top_bar(&tab_bar);
    root.set_content(Some(&shell));

    let app_overlay = gtk::Overlay::new();
    app_overlay.set_child(Some(&root));
    app_overlay.add_overlay(&workspace.panel);

    let toast_overlay = adw::ToastOverlay::new();
    toast_overlay.set_child(Some(&app_overlay));
    window.set_content(Some(&toast_overlay));

    let widgets = AppWidgets {
        stack,
        tab_view,
        home_tab,
        open_tabs,
        history: Rc::new(RefCell::new(NavigationHistory {
            current: Some(ViewState::Home(Page::Pokedex)),
            back: Vec::new(),
            forward: Vec::new(),
        })),
        applying_history: Rc::new(Cell::new(false)),
        nav_rows: Rc::new(nav_rows.clone()),
        search,
        workspace,
        toast_overlay,
        current_page,
        pokemon_model,
        move_model,
        item_model,
        nature_model,
        ability_flow,
        filtered_pokemon,
        filtered_moves,
        filtered_abilities,
        filtered_items,
        pokemon_count,
        move_count,
        ability_count,
        item_count,
        nature_count,
        favorite_ids: data.favorites.clone(),
        pokedex_filters,
        move_filters,
        ability_filters,
        item_filters,
        nature_filters,
        compare,
        compare_ids,
        compare_badge,
        detail,
        move_detail,
        ability_detail,
        item_detail,
        sprite_loader,
    };

    attach_filter_dropdowns(&widgets, &app_overlay);
    update_compare_badge(&widgets.compare_badge, widgets.compare_ids.borrow().len());
    refresh_all_pages(&widgets, &data, "");
    connect_navigation(&widgets, &nav_rows, data.clone());
    connect_search(&widgets, data.clone());
    connect_filter_controls(&widgets, data.clone());
    connect_tab_view(&widgets, pool.clone(), runtime.clone(), data.clone());
    connect_pokemon_activation(
        &pokedex_page,
        &widgets,
        pool.clone(),
        runtime.clone(),
        widgets.filtered_pokemon.clone(),
        data.clone(),
    );
    connect_move_activation(
        &moves_page,
        &widgets,
        pool.clone(),
        runtime.clone(),
        widgets.filtered_moves.clone(),
        data.clone(),
    );
    connect_item_activation(
        &items_page,
        &widgets,
        pool.clone(),
        runtime.clone(),
        widgets.filtered_items.clone(),
        data.clone(),
    );
    connect_ability_activation(
        &widgets,
        pool.clone(),
        runtime.clone(),
        widgets.filtered_abilities.clone(),
        data.clone(),
    );
    connect_target_mouse_actions(
        &widgets.detail.evolution,
        true,
        &widgets,
        pool.clone(),
        runtime.clone(),
        data.clone(),
    );
    connect_target_mouse_actions(
        &widgets.detail.abilities,
        true,
        &widgets,
        pool.clone(),
        runtime.clone(),
        data.clone(),
    );
    connect_target_mouse_actions(
        &widgets.detail.moves,
        true,
        &widgets,
        pool.clone(),
        runtime.clone(),
        data.clone(),
    );
    connect_target_mouse_actions(
        &widgets.move_detail.related,
        true,
        &widgets,
        pool.clone(),
        runtime.clone(),
        data.clone(),
    );
    connect_target_mouse_actions(
        &widgets.ability_detail.related,
        true,
        &widgets,
        pool.clone(),
        runtime.clone(),
        data.clone(),
    );
    connect_mouse_history_buttons(&root, &widgets, pool.clone(), runtime.clone(), data.clone());
    connect_workspace_ui(
        &widgets,
        pool.clone(),
        runtime.clone(),
        data.clone(),
        window.clone(),
    );
    start_workspace_autosave(&widgets);

    let startup_move_id = std::env::var("POKEDIA_START_MOVE_ID")
        .ok()
        .and_then(|value| value.parse::<i64>().ok());
    let startup_item_id = std::env::var("POKEDIA_START_ITEM_ID")
        .ok()
        .and_then(|value| value.parse::<i64>().ok());
    let startup_ability_id = std::env::var("POKEDIA_START_ABILITY_ID")
        .ok()
        .and_then(|value| value.parse::<i64>().ok());
    let startup_page = std::env::var("POKEDIA_START_PAGE")
        .ok()
        .and_then(|value| Page::from_key(value.as_str()));
    let has_startup_override = startup_move_id.is_some()
        || startup_item_id.is_some()
        || startup_ability_id.is_some()
        || startup_page.is_some()
        || startup_detail_id.is_some();

    if !has_startup_override {
        let snapshot = {
            let store = widgets.workspace.store.borrow();
            active_workspace(&store)
                .map(|workspace| workspace.snapshot.clone())
                .unwrap_or_default()
        };
        apply_workspace_snapshot(&widgets, &pool, &runtime, &data, &snapshot);
        refresh_workspace_menu(
            &widgets,
            pool.clone(),
            runtime.clone(),
            data.clone(),
            window.clone(),
        );
    } else if let Some(move_id) = startup_move_id {
        open_target_in_new_tab(
            &widgets,
            pool.clone(),
            runtime.clone(),
            data.clone(),
            TabTarget::Move(move_id),
            true,
        );
    } else if let Some(item_id) = startup_item_id {
        open_target_in_new_tab(
            &widgets,
            pool.clone(),
            runtime.clone(),
            data.clone(),
            TabTarget::Item(item_id),
            true,
        );
    } else if let Some(ability_id) = startup_ability_id {
        open_target_in_new_tab(
            &widgets,
            pool.clone(),
            runtime.clone(),
            data.clone(),
            TabTarget::Ability(ability_id),
            true,
        );
    } else if let Some(page) = startup_page {
        show_page(&widgets, &nav_rows, &data, page);
    } else if let Some(pokemon_id) = startup_detail_id {
        open_target_in_new_tab(
            &widgets,
            pool.clone(),
            runtime.clone(),
            data.clone(),
            TabTarget::Pokemon(pokemon_id),
            true,
        );
    }
    save_current_workspace(&widgets);

    window.present();
}

fn install_css() {
    let Some(display) = gtk::gdk::Display::default() else {
        return;
    };

    let provider = gtk::CssProvider::new();
    provider.load_from_string(STYLE);
    gtk::style_context_add_provider_for_display(
        &display,
        &provider,
        gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
    );
}

fn build_header(search: &gtk::SearchEntry, workspace_button: &gtk::Button) -> adw::HeaderBar {
    let header = adw::HeaderBar::new();
    header.add_css_class("app-header");

    let title = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    title.add_css_class("app-brand");
    title.set_valign(gtk::Align::Center);
    let icon_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("icons/32x32.png");
    let icon = gtk::Image::new();
    icon.set_from_file(Some(&icon_path));
    icon.add_css_class("app-brand-logo");
    icon.set_width_request(22);
    icon.set_height_request(22);
    icon.set_pixel_size(22);
    let label = gtk::Label::new(Some("Pokedia"));
    label.add_css_class("header-title");
    title.append(&icon);
    title.append(&label);
    header.pack_start(&title);
    header.pack_start(workspace_button);

    header.set_title_widget(Some(search));

    header
}

fn build_workspace_switcher(store: Rc<RefCell<WorkspaceStore>>) -> WorkspaceUi {
    let button = gtk::Button::new();
    button.add_css_class("workspace-button");
    button.set_tooltip_text(Some("Switch workspace"));
    button.set_valign(gtk::Align::Center);
    button.set_width_request(122);
    button.set_height_request(30);

    let button_content = gtk::Box::new(gtk::Orientation::Horizontal, 6);
    button_content.set_valign(gtk::Align::Center);
    let icon = gtk::Image::from_icon_name("folder-open-symbolic");
    icon.set_pixel_size(14);
    let label = gtk::Label::new(None);
    label.add_css_class("workspace-label");
    label.set_ellipsize(gtk::pango::EllipsizeMode::End);
    label.set_max_width_chars(12);
    label.set_xalign(0.0);
    let arrow = gtk::Image::from_icon_name("pan-down-symbolic");
    arrow.set_pixel_size(11);
    button_content.append(&icon);
    button_content.append(&label);
    button_content.append(&arrow);
    button.set_child(Some(&button_content));

    let panel = WorkspacePanel::new();
    panel.set_halign(gtk::Align::Start);
    panel.set_valign(gtk::Align::Start);
    panel.set_visible(false);
    let menu = gtk::Box::new(gtk::Orientation::Vertical, 6);
    menu.add_css_class("workspace-menu");
    panel.append(&menu);

    let ui = WorkspaceUi {
        button,
        label,
        panel,
        menu,
        store,
        suppress_autosave: Rc::new(Cell::new(false)),
    };
    refresh_workspace_label(&ui);
    let panel = ui.panel.clone();
    ui.button.connect_clicked(move |_| {
        panel.set_visible(!panel.is_visible());
    });
    ui
}

fn workspace_store_path() -> PathBuf {
    native::app_data_dir().join("gtk-workspaces.json")
}

fn load_workspace_store() -> WorkspaceStore {
    let path = workspace_store_path();
    let mut store = fs::read_to_string(path)
        .ok()
        .and_then(|content| serde_json::from_str::<WorkspaceStore>(&content).ok())
        .unwrap_or_default();
    normalize_workspace_store(&mut store);
    store
}

fn normalize_workspace_store(store: &mut WorkspaceStore) {
    store
        .workspaces
        .retain(|workspace| !workspace.id.trim().is_empty());
    if store.workspaces.is_empty() {
        *store = WorkspaceStore::default();
        return;
    }

    let mut seen = HashSet::new();
    store
        .workspaces
        .retain(|workspace| seen.insert(workspace.id.clone()));

    for workspace in &mut store.workspaces {
        if workspace.name.trim().is_empty() {
            workspace.name = "Untitled Workspace".to_owned();
        }
    }

    if !store
        .workspaces
        .iter()
        .any(|workspace| workspace.id == store.active_id)
    {
        store.active_id = store
            .workspaces
            .first()
            .map(|workspace| workspace.id.clone())
            .unwrap_or_else(|| "default".to_owned());
    }

    let highest_id = store
        .workspaces
        .iter()
        .filter_map(|workspace| workspace.id.strip_prefix("workspace-"))
        .filter_map(|suffix| suffix.parse::<u64>().ok())
        .max()
        .unwrap_or(1);
    store.next_id = store.next_id.max(highest_id + 1);
}

fn persist_workspace_store(store: &WorkspaceStore) {
    let path = workspace_store_path();
    if let Some(parent) = path.parent() {
        if let Err(error) = fs::create_dir_all(parent) {
            eprintln!("Failed to create workspace directory: {error}");
            return;
        }
    }

    match serde_json::to_string_pretty(store) {
        Ok(json) => {
            if let Err(error) = fs::write(path, json) {
                eprintln!("Failed to save workspaces: {error}");
            }
        }
        Err(error) => eprintln!("Failed to serialize workspaces: {error}"),
    }
}

fn active_workspace(store: &WorkspaceStore) -> Option<&Workspace> {
    store
        .workspaces
        .iter()
        .find(|workspace| workspace.id == store.active_id)
        .or_else(|| store.workspaces.first())
}

fn active_workspace_mut(store: &mut WorkspaceStore) -> Option<&mut Workspace> {
    let active_id = store.active_id.clone();
    if let Some(index) = store
        .workspaces
        .iter()
        .position(|workspace| workspace.id == active_id)
    {
        store.workspaces.get_mut(index)
    } else {
        store.workspaces.first_mut()
    }
}

fn refresh_workspace_label(ui: &WorkspaceUi) {
    let store = ui.store.borrow();
    let name = active_workspace(&store)
        .map(|workspace| workspace.name.as_str())
        .unwrap_or("Default");
    ui.label.set_text(name);
    ui.button
        .set_tooltip_text(Some(&format!("Workspace: {name}")));
}

fn next_workspace_id(store: &mut WorkspaceStore) -> String {
    loop {
        let id = format!("workspace-{}", store.next_id);
        store.next_id += 1;
        if !store.workspaces.iter().any(|workspace| workspace.id == id) {
            return id;
        }
    }
}

fn unique_workspace_name(
    store: &WorkspaceStore,
    requested: &str,
    except_id: Option<&str>,
) -> String {
    let base = requested.trim();
    let base = if base.is_empty() {
        "Untitled Workspace"
    } else {
        base
    };
    let mut candidate = base.to_owned();
    let mut suffix = 2;

    while store.workspaces.iter().any(|workspace| {
        Some(workspace.id.as_str()) != except_id
            && workspace.name.eq_ignore_ascii_case(candidate.as_str())
    }) {
        candidate = format!("{base} {suffix}");
        suffix += 1;
    }

    candidate
}

fn capture_workspace_snapshot(widgets: &AppWidgets) -> WorkspaceSnapshot {
    let selected_page = widgets.tab_view.selected_page();
    let active = selected_page
        .as_ref()
        .and_then(|page| {
            if *page == widgets.home_tab {
                None
            } else {
                selected_tab_target(widgets, page).map(ViewState::Target)
            }
        })
        .unwrap_or_else(|| ViewState::Home(*widgets.current_page.borrow()));

    let tabs = widgets
        .open_tabs
        .borrow()
        .iter()
        .map(|tab| tab.target.clone())
        .collect::<Vec<_>>();

    WorkspaceSnapshot {
        current_page: *widgets.current_page.borrow(),
        active,
        tabs,
        search_query: widgets.search.text().to_string(),
        filters: capture_workspace_filters(widgets),
        compare_ids: widgets.compare_ids.borrow().clone(),
    }
}

fn capture_workspace_filters(widgets: &AppWidgets) -> WorkspaceFilters {
    WorkspaceFilters {
        pokedex_type: widgets.pokedex_filters.type_filter.selected(),
        pokedex_second_type: widgets.pokedex_filters.second_type_filter.selected(),
        pokedex_generation: widgets.pokedex_filters.generation_filter.selected(),
        pokedex_sort: widgets
            .pokedex_filters
            .sort_filters
            .iter()
            .map(FilterDropdown::selected)
            .collect(),
        pokedex_favorites: widgets.pokedex_filters.favorites_filter.is_active(),
        move_type: widgets.move_filters.type_filter.selected(),
        move_class: widgets.move_filters.class_filter.selected(),
        move_min_power: widgets.move_filters.min_power_filter.selected(),
        move_max_power: widgets.move_filters.max_power_filter.selected(),
        ability_generation: widgets.ability_filters.generation_filter.selected(),
        item_category: widgets.item_filters.category_filter.selected(),
        nature_stat: widgets.nature_filters.stat_filter.selected(),
    }
}

fn save_current_workspace(widgets: &AppWidgets) {
    if widgets.workspace.suppress_autosave.get() {
        return;
    }

    let snapshot = capture_workspace_snapshot(widgets);
    {
        let mut store = widgets.workspace.store.borrow_mut();
        if let Some(workspace) = active_workspace_mut(&mut store) {
            workspace.snapshot = snapshot;
        }
        normalize_workspace_store(&mut store);
        persist_workspace_store(&store);
    }
    refresh_workspace_label(&widgets.workspace);
}

fn start_workspace_autosave(widgets: &AppWidgets) {
    let widgets = widgets.clone();
    glib::timeout_add_local(WORKSPACE_AUTOSAVE_INTERVAL, move || {
        save_current_workspace(&widgets);
        glib::ControlFlow::Continue
    });
}

fn apply_workspace_snapshot(
    widgets: &AppWidgets,
    pool: &sqlx::SqlitePool,
    runtime: &tokio::runtime::Runtime,
    data: &LoadedData,
    snapshot: &WorkspaceSnapshot,
) {
    widgets.workspace.suppress_autosave.set(true);
    widgets.applying_history.set(true);

    close_workspace_tabs(widgets);
    apply_workspace_filters(widgets, &snapshot.filters);
    widgets.search.set_text(snapshot.search_query.as_str());
    widgets
        .compare_ids
        .replace(dedup_compare_ids(&snapshot.compare_ids));
    update_compare_badge(&widgets.compare_badge, widgets.compare_ids.borrow().len());
    refresh_all_pages(widgets, data, snapshot.search_query.as_str());

    for target in &snapshot.tabs {
        append_target_tab(widgets, data, target);
    }

    let next_state = match &snapshot.active {
        ViewState::Target(target) => {
            let page = append_target_tab(widgets, data, target);
            widgets.tab_view.set_selected_page(&page);
            show_tab_target(widgets, pool, runtime, data, target);
            ViewState::Target(target.clone())
        }
        ViewState::Home(page) => {
            show_workspace_home_state(widgets, data, *page);
            ViewState::Home(*page)
        }
    };

    widgets.history.replace(NavigationHistory {
        current: Some(next_state),
        back: Vec::new(),
        forward: Vec::new(),
    });
    widgets.applying_history.set(false);
    widgets.workspace.suppress_autosave.set(false);
}

fn close_workspace_tabs(widgets: &AppWidgets) {
    let pages = widgets
        .open_tabs
        .borrow()
        .iter()
        .map(|tab| tab.page.clone())
        .collect::<Vec<_>>();
    widgets.open_tabs.borrow_mut().clear();
    widgets.tab_view.set_selected_page(&widgets.home_tab);
    for page in pages {
        widgets.tab_view.close_page(&page);
    }
}

fn apply_workspace_filters(widgets: &AppWidgets, filters: &WorkspaceFilters) {
    set_dropdown_selected(&widgets.pokedex_filters.type_filter, filters.pokedex_type);
    set_dropdown_selected(
        &widgets.pokedex_filters.second_type_filter,
        filters.pokedex_second_type,
    );
    widgets
        .pokedex_filters
        .second_type_filter
        .set_visible(filters.pokedex_type != 0);
    set_dropdown_selected(
        &widgets.pokedex_filters.generation_filter,
        filters.pokedex_generation,
    );
    for (idx, dropdown) in widgets.pokedex_filters.sort_filters.iter().enumerate() {
        set_dropdown_selected(
            dropdown,
            filters.pokedex_sort.get(idx).copied().unwrap_or(0),
        );
    }
    update_pokedex_sort_filter_visibility(&widgets.pokedex_filters);
    widgets
        .pokedex_filters
        .favorites_filter
        .set_active(filters.pokedex_favorites);
    widgets
        .pokedex_filters
        .favorites_filter
        .set_label(if filters.pokedex_favorites {
            "♥ Favorites"
        } else {
            "♡ Favorites"
        });

    set_dropdown_selected(&widgets.move_filters.type_filter, filters.move_type);
    set_dropdown_selected(&widgets.move_filters.class_filter, filters.move_class);
    set_dropdown_selected(
        &widgets.move_filters.min_power_filter,
        filters.move_min_power,
    );
    set_dropdown_selected(
        &widgets.move_filters.max_power_filter,
        filters.move_max_power,
    );
    set_dropdown_selected(
        &widgets.ability_filters.generation_filter,
        filters.ability_generation,
    );
    set_dropdown_selected(&widgets.item_filters.category_filter, filters.item_category);
    set_dropdown_selected(&widgets.nature_filters.stat_filter, filters.nature_stat);
}

fn set_dropdown_selected(dropdown: &FilterDropdown, selected: u32) {
    let selected = if selected == gtk::INVALID_LIST_POSITION {
        0
    } else {
        selected
    };
    dropdown.set_selected(selected);
}

fn show_workspace_home_state(widgets: &AppWidgets, data: &LoadedData, page: Page) {
    set_selected_nav_rows(&widgets.nav_rows, page);
    widgets.current_page.replace(page);
    widgets.stack.set_visible_child_name(page.stack_name());
    widgets.tab_view.set_selected_page(&widgets.home_tab);
    widgets
        .search
        .set_placeholder_text(Some(page.search_placeholder()));
    if page == Page::Compare {
        render_compare_page(
            &widgets.compare,
            data.pokemon.clone(),
            widgets.compare_ids.clone(),
            widgets.compare_badge.clone(),
            widgets.sprite_loader.clone(),
        );
    }
}

fn attach_filter_dropdowns(widgets: &AppWidgets, overlay: &gtk::Overlay) {
    let dropdowns = Rc::new(all_filter_dropdowns(widgets));
    let workspace = widgets.workspace.clone();
    for dropdown in dropdowns.iter() {
        overlay.add_overlay(&dropdown.panel);
        let current = dropdown.clone();
        let overlay = overlay.clone();
        let all_dropdowns = dropdowns.clone();
        let workspace = workspace.clone();
        dropdown.button.connect_clicked(move |_| {
            let was_open = current.panel.is_visible();
            for dropdown in all_dropdowns.iter() {
                dropdown.hide_menu();
            }
            hide_workspace_menu(&workspace);
            if !was_open && current.button.is_visible() {
                current.show_menu(&overlay);
            }
        });
    }

    let all_dropdowns = dropdowns.clone();
    widgets.workspace.button.connect_clicked(move |_| {
        for dropdown in all_dropdowns.iter() {
            dropdown.hide_menu();
        }
    });

    let all_dropdowns = dropdowns.clone();
    let overlay_for_click = overlay.clone();
    let workspace = widgets.workspace.clone();
    let outside_click = gtk::GestureClick::new();
    outside_click.set_button(0);
    outside_click.set_propagation_phase(gtk::PropagationPhase::Capture);
    outside_click.connect_pressed(move |gesture, _, x, y| {
        if gesture.current_button() != 1 {
            return;
        }
        let hits_filter = all_dropdowns
            .iter()
            .any(|dropdown| filter_dropdown_contains_point(dropdown, &overlay_for_click, x, y));
        let hits_workspace =
            workspace_dropdown_contains_point(&workspace, &overlay_for_click, x, y);
        if hits_filter || hits_workspace {
            return;
        }
        for dropdown in all_dropdowns.iter() {
            dropdown.hide_menu();
        }
        hide_workspace_menu(&workspace);
    });
    overlay.add_controller(outside_click);
}

fn all_filter_dropdowns(widgets: &AppWidgets) -> Vec<FilterDropdown> {
    let mut dropdowns = vec![
        widgets.pokedex_filters.type_filter.clone(),
        widgets.pokedex_filters.second_type_filter.clone(),
        widgets.pokedex_filters.generation_filter.clone(),
        widgets.move_filters.type_filter.clone(),
        widgets.move_filters.class_filter.clone(),
        widgets.move_filters.min_power_filter.clone(),
        widgets.move_filters.max_power_filter.clone(),
        widgets.ability_filters.generation_filter.clone(),
        widgets.item_filters.category_filter.clone(),
        widgets.nature_filters.stat_filter.clone(),
    ];
    dropdowns.extend(widgets.pokedex_filters.sort_filters.iter().cloned());
    dropdowns
}

fn filter_dropdown_contains_point(
    dropdown: &FilterDropdown,
    overlay: &gtk::Overlay,
    x: f64,
    y: f64,
) -> bool {
    widget_contains_overlay_point(&dropdown.button, overlay, x, y)
        || widget_contains_overlay_point(&dropdown.panel, overlay, x, y)
}

fn workspace_dropdown_contains_point(
    workspace: &WorkspaceUi,
    overlay: &gtk::Overlay,
    x: f64,
    y: f64,
) -> bool {
    widget_contains_overlay_point(&workspace.button, overlay, x, y)
        || widget_contains_overlay_point(&workspace.panel, overlay, x, y)
}

fn widget_contains_overlay_point<W: IsA<gtk::Widget>>(
    widget: &W,
    overlay: &gtk::Overlay,
    x: f64,
    y: f64,
) -> bool {
    let widget = widget.as_ref();
    if !widget.is_visible() || !widget.is_mapped() {
        return false;
    }
    let Some(bounds) = widget.compute_bounds(overlay) else {
        return false;
    };
    let x = x as f32;
    let y = y as f32;
    x >= bounds.x()
        && x <= bounds.x() + bounds.width()
        && y >= bounds.y()
        && y <= bounds.y() + bounds.height()
}

fn dedup_compare_ids(ids: &[i64]) -> Vec<i64> {
    ids.iter()
        .copied()
        .take(COMPARE_LIMIT)
        .fold(Vec::new(), |mut next, id| {
            if !next.contains(&id) {
                next.push(id);
            }
            next
        })
}

fn workspace_tab_count(workspace: &Workspace) -> usize {
    workspace.snapshot.tabs.len()
}

fn hide_workspace_menu(workspace: &WorkspaceUi) {
    workspace.panel.set_visible(false);
}

fn connect_workspace_ui(
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    data: LoadedData,
    window: adw::ApplicationWindow,
) {
    refresh_workspace_menu(widgets, pool, runtime, data, window);
}

fn refresh_workspace_menu(
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    data: LoadedData,
    window: adw::ApplicationWindow,
) {
    refresh_workspace_label(&widgets.workspace);
    clear_box(&widgets.workspace.menu);

    let title = gtk::Label::new(Some("Workspaces"));
    title.add_css_class("workspace-title");
    title.set_xalign(0.0);
    widgets.workspace.menu.append(&title);

    let (active_id, workspaces) = {
        let store = widgets.workspace.store.borrow();
        (store.active_id.clone(), store.workspaces.clone())
    };

    for workspace in workspaces {
        let line = gtk::Box::new(gtk::Orientation::Horizontal, 4);
        line.add_css_class("workspace-line");

        let row = gtk::Button::new();
        row.add_css_class("flat");
        row.add_css_class("workspace-row");
        if workspace.id == active_id {
            row.add_css_class("workspace-active");
        }
        row.set_hexpand(true);
        row.set_tooltip_text(Some(&format!("Switch to {}", workspace.name)));
        let row_content = gtk::Box::new(gtk::Orientation::Horizontal, 8);
        row_content.set_valign(gtk::Align::Center);
        let check = gtk::Image::from_icon_name(if workspace.id == active_id {
            "object-select-symbolic"
        } else {
            "folder-symbolic"
        });
        check.set_pixel_size(14);
        let name = gtk::Label::new(Some(&workspace.name));
        name.set_xalign(0.0);
        name.set_ellipsize(gtk::pango::EllipsizeMode::End);
        name.set_hexpand(true);
        row_content.append(&check);
        row_content.append(&name);
        row.set_child(Some(&row_content));

        let workspace_id = workspace.id.clone();
        let switch_widgets = widgets.clone();
        let switch_pool = pool.clone();
        let switch_runtime = runtime.clone();
        let switch_data = data.clone();
        let switch_window = window.clone();
        row.connect_clicked(move |_| {
            switch_workspace(
                &switch_widgets,
                switch_pool.clone(),
                switch_runtime.clone(),
                switch_data.clone(),
                switch_window.clone(),
                workspace_id.as_str(),
            );
        });
        line.append(&row);

        widgets.workspace.menu.append(&line);
    }

    widgets
        .workspace
        .menu
        .append(&gtk::Separator::new(gtk::Orientation::Horizontal));

    let new_empty = workspace_action_button("list-add-symbolic", "New Empty Workspace");
    let new_widgets = widgets.clone();
    let new_pool = pool.clone();
    let new_runtime = runtime.clone();
    let new_data = data.clone();
    let new_window = window.clone();
    new_empty.connect_clicked(move |_| {
        hide_workspace_menu(&new_widgets.workspace);
        show_new_empty_workspace_dialog(
            &new_window,
            &new_widgets,
            new_pool.clone(),
            new_runtime.clone(),
            new_data.clone(),
        );
    });
    widgets.workspace.menu.append(&new_empty);

    let duplicate = workspace_action_button("edit-copy-symbolic", "Save Current as New Workspace");
    let duplicate_widgets = widgets.clone();
    let duplicate_pool = pool.clone();
    let duplicate_runtime = runtime.clone();
    let duplicate_data = data.clone();
    let duplicate_window = window.clone();
    duplicate.connect_clicked(move |_| {
        hide_workspace_menu(&duplicate_widgets.workspace);
        show_duplicate_workspace_dialog(
            &duplicate_window,
            &duplicate_widgets,
            duplicate_pool.clone(),
            duplicate_runtime.clone(),
            duplicate_data.clone(),
        );
    });
    widgets.workspace.menu.append(&duplicate);

    let manage = workspace_action_button("view-list-symbolic", "Manage Workspaces...");
    let manage_widgets = widgets.clone();
    let manage_pool = pool;
    let manage_runtime = runtime;
    let manage_data = data;
    let manage_window = window;
    manage.connect_clicked(move |_| {
        hide_workspace_menu(&manage_widgets.workspace);
        show_manage_workspaces_dialog(
            &manage_window,
            &manage_widgets,
            manage_pool.clone(),
            manage_runtime.clone(),
            manage_data.clone(),
        );
    });
    widgets.workspace.menu.append(&manage);
}

fn workspace_icon_button(icon_name: &str, tooltip: &str) -> gtk::Button {
    let button = gtk::Button::from_icon_name(icon_name);
    button.add_css_class("flat");
    button.add_css_class("workspace-icon-button");
    button.set_tooltip_text(Some(tooltip));
    button
}

fn workspace_action_button(icon_name: &str, label: &str) -> gtk::Button {
    let button = gtk::Button::new();
    button.add_css_class("flat");
    button.add_css_class("workspace-action");
    let content = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    content.set_valign(gtk::Align::Center);
    let icon = gtk::Image::from_icon_name(icon_name);
    icon.set_pixel_size(14);
    let text = gtk::Label::new(Some(label));
    text.set_xalign(0.0);
    text.set_hexpand(true);
    content.append(&icon);
    content.append(&text);
    button.set_child(Some(&content));
    button
}

fn switch_workspace(
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    data: LoadedData,
    window: adw::ApplicationWindow,
    workspace_id: &str,
) {
    let already_active = widgets.workspace.store.borrow().active_id == workspace_id;
    if already_active {
        hide_workspace_menu(&widgets.workspace);
        return;
    }

    save_current_workspace(widgets);
    let snapshot_and_name = {
        let mut store = widgets.workspace.store.borrow_mut();
        store.active_id = workspace_id.to_owned();
        normalize_workspace_store(&mut store);
        persist_workspace_store(&store);
        active_workspace(&store)
            .map(|workspace| (workspace.snapshot.clone(), workspace.name.clone()))
    };

    let Some((snapshot, name)) = snapshot_and_name else {
        return;
    };

    apply_workspace_snapshot(widgets, &pool, &runtime, &data, &snapshot);
    refresh_workspace_menu(widgets, pool, runtime, data, window);
    hide_workspace_menu(&widgets.workspace);
    show_workspace_toast(widgets, &format!("Switched to {name}"));
}

fn show_new_empty_workspace_dialog(
    window: &adw::ApplicationWindow,
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    data: LoadedData,
) {
    save_current_workspace(widgets);
    let widgets = widgets.clone();
    let parent_window = window.clone();
    let refresh_window = window.clone();
    prompt_workspace_name(
        &parent_window,
        "New Empty Workspace",
        "Create",
        "",
        move |name| {
            let (snapshot, display_name) = {
                let current_snapshot = capture_workspace_snapshot(&widgets);
                let mut store = widgets.workspace.store.borrow_mut();
                if let Some(workspace) = active_workspace_mut(&mut store) {
                    workspace.snapshot = current_snapshot;
                }
                let name = unique_workspace_name(&store, &name, None);
                let id = next_workspace_id(&mut store);
                let snapshot = WorkspaceSnapshot::default();
                store.active_id = id.clone();
                store.workspaces.push(Workspace {
                    id,
                    name: name.clone(),
                    snapshot: snapshot.clone(),
                });
                persist_workspace_store(&store);
                (snapshot, name)
            };
            apply_workspace_snapshot(&widgets, &pool, &runtime, &data, &snapshot);
            refresh_workspace_menu(
                &widgets,
                pool.clone(),
                runtime.clone(),
                data.clone(),
                refresh_window.clone(),
            );
            show_workspace_toast(&widgets, &format!("Created {display_name}"));
        },
    );
}

fn show_duplicate_workspace_dialog(
    window: &adw::ApplicationWindow,
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    data: LoadedData,
) {
    let suggested = {
        let store = widgets.workspace.store.borrow();
        active_workspace(&store)
            .map(|workspace| format!("{} Copy", workspace.name))
            .unwrap_or_else(|| "Workspace Copy".to_owned())
    };
    let widgets = widgets.clone();
    let parent_window = window.clone();
    let refresh_window = window.clone();
    prompt_workspace_name(
        &parent_window,
        "Save Current as New Workspace",
        "Save",
        suggested.as_str(),
        move |name| {
            let (snapshot, display_name) = {
                let snapshot = capture_workspace_snapshot(&widgets);
                let mut store = widgets.workspace.store.borrow_mut();
                if let Some(workspace) = active_workspace_mut(&mut store) {
                    workspace.snapshot = snapshot.clone();
                }
                let name = unique_workspace_name(&store, &name, None);
                let id = next_workspace_id(&mut store);
                store.active_id = id.clone();
                store.workspaces.push(Workspace {
                    id,
                    name: name.clone(),
                    snapshot: snapshot.clone(),
                });
                persist_workspace_store(&store);
                (snapshot, name)
            };
            apply_workspace_snapshot(&widgets, &pool, &runtime, &data, &snapshot);
            refresh_workspace_menu(
                &widgets,
                pool.clone(),
                runtime.clone(),
                data.clone(),
                refresh_window.clone(),
            );
            show_workspace_toast(&widgets, &format!("Saved {display_name}"));
        },
    );
}

fn show_rename_workspace_dialog(
    window: &adw::ApplicationWindow,
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    data: LoadedData,
    workspace_id: String,
    current_name: String,
) {
    let widgets = widgets.clone();
    let parent_window = window.clone();
    let refresh_window = window.clone();
    prompt_workspace_name(
        &parent_window,
        "Rename Workspace",
        "Rename",
        current_name.as_str(),
        move |name| {
            save_current_workspace(&widgets);
            let display_name = {
                let mut store = widgets.workspace.store.borrow_mut();
                let name = unique_workspace_name(&store, &name, Some(workspace_id.as_str()));
                if let Some(workspace) = store
                    .workspaces
                    .iter_mut()
                    .find(|workspace| workspace.id == workspace_id)
                {
                    workspace.name = name.clone();
                }
                persist_workspace_store(&store);
                name
            };
            refresh_workspace_menu(
                &widgets,
                pool.clone(),
                runtime.clone(),
                data.clone(),
                refresh_window.clone(),
            );
            show_workspace_toast(&widgets, &format!("Renamed to {display_name}"));
        },
    );
}

#[allow(deprecated)]
fn show_delete_workspace_confirmation(
    window: &adw::ApplicationWindow,
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    data: LoadedData,
    workspace_id: String,
    workspace_name: String,
) {
    let dialog = gtk::Dialog::builder()
        .title("Delete Workspace")
        .modal(true)
        .transient_for(window)
        .build();
    dialog.add_button("Cancel", gtk::ResponseType::Cancel);
    dialog.add_button("Delete", gtk::ResponseType::Accept);
    dialog.set_default_response(gtk::ResponseType::Cancel);
    if let Some(button) = dialog.widget_for_response(gtk::ResponseType::Accept) {
        button.add_css_class("destructive-action");
    }

    let content = dialog.content_area();
    content.add_css_class("workspace-dialog-content");
    let label = gtk::Label::new(Some(&format!(
        "Delete \"{workspace_name}\"? This only removes the saved workspace, not the app data."
    )));
    label.set_wrap(true);
    label.set_xalign(0.0);
    content.append(&label);

    let widgets = widgets.clone();
    let window = window.clone();
    dialog.connect_response(move |dialog, response| {
        if response == gtk::ResponseType::Accept {
            delete_workspace(
                &widgets,
                pool.clone(),
                runtime.clone(),
                data.clone(),
                window.clone(),
                workspace_id.as_str(),
                workspace_name.as_str(),
            );
        }
        dialog.close();
    });
    dialog.present();
}

fn delete_workspace(
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    data: LoadedData,
    window: adw::ApplicationWindow,
    workspace_id: &str,
    workspace_name: &str,
) {
    if widgets.workspace.store.borrow().workspaces.len() <= 1 {
        show_workspace_toast(widgets, "Keep at least one workspace");
        return;
    }

    save_current_workspace(widgets);
    let deleted_active;
    let next_snapshot = {
        let mut store = widgets.workspace.store.borrow_mut();
        deleted_active = store.active_id == workspace_id;
        store
            .workspaces
            .retain(|workspace| workspace.id != workspace_id);
        if deleted_active {
            store.active_id = store
                .workspaces
                .first()
                .map(|workspace| workspace.id.clone())
                .unwrap_or_else(|| "default".to_owned());
        }
        normalize_workspace_store(&mut store);
        persist_workspace_store(&store);
        if deleted_active {
            active_workspace(&store).map(|workspace| workspace.snapshot.clone())
        } else {
            None
        }
    };

    if let Some(snapshot) = next_snapshot {
        apply_workspace_snapshot(widgets, &pool, &runtime, &data, &snapshot);
    }
    refresh_workspace_menu(widgets, pool, runtime, data, window);
    show_workspace_toast(widgets, &format!("Deleted {workspace_name}"));
}

#[allow(deprecated)]
fn show_manage_workspaces_dialog(
    window: &adw::ApplicationWindow,
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    data: LoadedData,
) {
    let dialog = gtk::Dialog::builder()
        .title("Manage Workspaces")
        .modal(true)
        .transient_for(window)
        .default_width(430)
        .build();
    dialog.add_button("Close", gtk::ResponseType::Close);

    let content = dialog.content_area();
    content.add_css_class("workspace-dialog-content");
    let list = gtk::Box::new(gtk::Orientation::Vertical, 6);
    content.append(&list);

    let (active_id, workspaces, can_delete) = {
        let store = widgets.workspace.store.borrow();
        (
            store.active_id.clone(),
            store.workspaces.clone(),
            store.workspaces.len() > 1,
        )
    };

    for workspace in workspaces {
        let row = gtk::Box::new(gtk::Orientation::Horizontal, 8);
        row.add_css_class("settings-row");

        let info = gtk::Box::new(gtk::Orientation::Vertical, 2);
        info.set_hexpand(true);
        let name = gtk::Label::new(Some(&workspace.name));
        name.add_css_class("row-title");
        name.set_xalign(0.0);
        let meta = gtk::Label::new(Some(&format!(
            "{} tabs{}",
            workspace_tab_count(&workspace),
            if workspace.id == active_id {
                " / active"
            } else {
                ""
            }
        )));
        meta.add_css_class("workspace-meta");
        meta.set_xalign(0.0);
        info.append(&name);
        info.append(&meta);
        row.append(&info);

        let rename = workspace_icon_button("document-edit-symbolic", "Rename workspace");
        let rename_widgets = widgets.clone();
        let rename_pool = pool.clone();
        let rename_runtime = runtime.clone();
        let rename_data = data.clone();
        let rename_window = window.clone();
        let rename_id = workspace.id.clone();
        let rename_name = workspace.name.clone();
        let rename_dialog = dialog.clone();
        rename.connect_clicked(move |_| {
            rename_dialog.close();
            show_rename_workspace_dialog(
                &rename_window,
                &rename_widgets,
                rename_pool.clone(),
                rename_runtime.clone(),
                rename_data.clone(),
                rename_id.clone(),
                rename_name.clone(),
            );
        });
        row.append(&rename);

        let delete = workspace_icon_button("user-trash-symbolic", "Delete workspace");
        delete.add_css_class("workspace-danger");
        delete.set_sensitive(can_delete);
        let delete_widgets = widgets.clone();
        let delete_pool = pool.clone();
        let delete_runtime = runtime.clone();
        let delete_data = data.clone();
        let delete_window = window.clone();
        let delete_id = workspace.id.clone();
        let delete_name = workspace.name.clone();
        let delete_dialog = dialog.clone();
        delete.connect_clicked(move |_| {
            delete_dialog.close();
            show_delete_workspace_confirmation(
                &delete_window,
                &delete_widgets,
                delete_pool.clone(),
                delete_runtime.clone(),
                delete_data.clone(),
                delete_id.clone(),
                delete_name.clone(),
            );
        });
        row.append(&delete);
        list.append(&row);
    }

    dialog.connect_response(|dialog, _| dialog.close());
    dialog.present();
}

#[allow(deprecated)]
fn prompt_workspace_name<W, F>(
    window: &W,
    title: &str,
    action_label: &str,
    initial_name: &str,
    on_confirm: F,
) where
    W: IsA<gtk::Window>,
    F: Fn(String) + 'static,
{
    let dialog = gtk::Dialog::builder()
        .title(title)
        .modal(true)
        .transient_for(window)
        .default_width(360)
        .build();
    dialog.add_button("Cancel", gtk::ResponseType::Cancel);
    dialog.add_button(action_label, gtk::ResponseType::Accept);
    dialog.set_default_response(gtk::ResponseType::Accept);

    let content = dialog.content_area();
    content.add_css_class("workspace-dialog-content");
    let entry = gtk::Entry::new();
    entry.set_activates_default(true);
    entry.set_placeholder_text(Some("Workspace name"));
    entry.set_text(initial_name);
    entry.select_region(0, -1);
    content.append(&entry);

    let on_confirm = Rc::new(on_confirm);
    let entry_for_response = entry.clone();
    dialog.connect_response(move |dialog, response| {
        if response == gtk::ResponseType::Accept {
            let name = entry_for_response.text().trim().to_owned();
            if name.is_empty() {
                entry_for_response.add_css_class("error");
                entry_for_response.grab_focus();
                return;
            }
            on_confirm(name);
        }
        dialog.close();
    });

    dialog.present();
    entry.grab_focus();
}

fn show_workspace_toast(widgets: &AppWidgets, message: &str) {
    widgets.toast_overlay.add_toast(adw::Toast::new(message));
}

fn build_sidebar() -> (gtk::Box, Vec<(Page, gtk::ListBoxRow)>, gtk::Label) {
    let sidebar = gtk::Box::new(gtk::Orientation::Vertical, 12);
    sidebar.add_css_class("sidebar-pane");
    sidebar.set_width_request(160);

    let content = gtk::Box::new(gtk::Orientation::Vertical, 10);
    content.set_margin_top(16);
    content.set_margin_bottom(16);

    let mut rows = Vec::new();
    let compare_badge = gtk::Label::new(Some("0"));
    compare_badge.add_css_class("accent");
    compare_badge.add_css_class("circular");
    compare_badge.set_visible(false);

    append_sidebar_section(&content, "Encyclopedia");
    let encyclopedia = gtk::ListBox::new();
    encyclopedia.add_css_class("navigation-sidebar");
    append_nav_row(
        &encyclopedia,
        &mut rows,
        Page::Pokedex,
        "Pokédex",
        "view-list-symbolic",
        true,
        None,
    );
    append_nav_row(
        &encyclopedia,
        &mut rows,
        Page::Moves,
        "Moves",
        "media-playlist-shuffle-symbolic",
        false,
        None,
    );
    append_nav_row(
        &encyclopedia,
        &mut rows,
        Page::Abilities,
        "Abilities",
        "starred-symbolic",
        false,
        None,
    );
    append_nav_row(
        &encyclopedia,
        &mut rows,
        Page::Items,
        "Items",
        "package-x-generic-symbolic",
        false,
        None,
    );
    append_nav_row(
        &encyclopedia,
        &mut rows,
        Page::Natures,
        "Natures",
        "weather-clear-symbolic",
        false,
        None,
    );
    content.append(&encyclopedia);

    append_sidebar_section(&content, "Tools");
    let tools = gtk::ListBox::new();
    tools.add_css_class("navigation-sidebar");
    append_nav_row(
        &tools,
        &mut rows,
        Page::Types,
        "Types",
        "view-grid-symbolic",
        false,
        None,
    );
    append_nav_row(
        &tools,
        &mut rows,
        Page::Compare,
        "Compare",
        "view-dual-symbolic",
        false,
        Some(&compare_badge),
    );
    append_nav_row(
        &tools,
        &mut rows,
        Page::Settings,
        "Settings",
        "emblem-system-symbolic",
        false,
        None,
    );
    content.append(&tools);

    let scroller = gtk::ScrolledWindow::builder()
        .hscrollbar_policy(gtk::PolicyType::Automatic)
        .child(&content)
        .vexpand(true)
        .build();
    sidebar.append(&scroller);

    let footer = gtk::Box::new(gtk::Orientation::Vertical, 8);
    footer.set_margin_start(18);
    footer.set_margin_end(18);
    footer.set_margin_bottom(16);
    let sync = gtk::Label::new(Some("●  Sync"));
    sync.add_css_class("muted");
    sync.set_xalign(0.0);
    footer.append(&sync);
    sidebar.append(&footer);

    (sidebar, rows, compare_badge)
}

fn append_sidebar_section(container: &gtk::Box, text: &str) {
    let label = gtk::Label::new(Some(text));
    label.add_css_class("sidebar-section");
    label.set_xalign(0.0);
    label.set_margin_start(18);
    label.set_margin_end(18);
    label.set_margin_top(8);
    container.append(&label);
}

fn append_nav_row(
    list: &gtk::ListBox,
    rows: &mut Vec<(Page, gtk::ListBoxRow)>,
    page: Page,
    label: &str,
    icon_name: &str,
    selected: bool,
    badge: Option<&gtk::Label>,
) {
    let row = gtk::ListBoxRow::new();
    row.add_css_class("nav-row");
    row.set_activatable(true);
    row.set_selectable(false);
    if selected {
        row.add_css_class("selected-nav");
    }

    let layout = gtk::Box::new(gtk::Orientation::Horizontal, 10);
    let icon = gtk::Image::from_icon_name(icon_name);
    let title = gtk::Label::new(Some(label));
    title.set_xalign(0.0);
    title.set_hexpand(true);
    layout.append(&icon);
    layout.append(&title);

    if let Some(badge) = badge {
        layout.append(badge);
    }

    row.set_child(Some(&layout));
    list.append(&row);
    rows.push((page, row));
}

fn build_pokedex_page(
    model: &gtk::StringList,
    sprite_loader: &SpriteLoader,
    compare_ids: Rc<RefCell<Vec<i64>>>,
    compare_badge: gtk::Label,
) -> (gtk::Box, gtk::Label, PokedexFilterWidgets) {
    let page = page_box();
    let toolbar = adw::WrapBox::new();
    toolbar.add_css_class("toolbar-card");
    toolbar.set_child_spacing(6);
    toolbar.set_line_spacing(6);
    let type_filter = dropdown_from_options(&type_filter_labels());
    let second_type_filter = dropdown_from_options(&second_type_filter_labels());
    second_type_filter.set_visible(false);
    let generation_filter = dropdown_from_static(GENERATION_LABELS);
    let sort_filters = (0..4)
        .map(|idx| {
            let dropdown = dropdown_from_static(POKEDEX_SORT_LABELS);
            dropdown.set_visible(idx == 0);
            dropdown
        })
        .collect::<Vec<_>>();
    let favorites_filter = gtk::ToggleButton::with_label("♡ Favorites");
    favorites_filter.add_css_class("flat");
    favorites_filter.add_css_class("filter-toggle");
    toolbar.append(type_filter.widget());
    toolbar.append(second_type_filter.widget());
    toolbar.append(generation_filter.widget());
    for sort_filter in &sort_filters {
        toolbar.append(sort_filter.widget());
    }
    toolbar.append(&favorites_filter);
    let count = count_label();
    toolbar.append(&count);
    page.append(&toolbar);

    let panel = gtk::Box::new(gtk::Orientation::Vertical, 0);
    panel.add_css_class("section-card");
    panel.set_vexpand(true);
    panel.append(&build_pokemon_header());

    let factory = build_pokemon_factory(sprite_loader.clone(), compare_ids, compare_badge);
    let selection = gtk::SingleSelection::new(Some(model.clone()));
    let list = gtk::ListView::new(Some(selection), Some(factory));
    list.add_css_class("data-list");
    list.set_single_click_activate(true);
    list.set_halign(gtk::Align::Fill);
    list.set_hexpand(true);
    list.set_vexpand(true);

    let scroller = table_scroller(&list);
    panel.append(&scroller);
    page.append(&panel);

    (
        page,
        count,
        PokedexFilterWidgets {
            type_filter,
            second_type_filter,
            generation_filter,
            sort_filters,
            favorites_filter,
        },
    )
}

fn build_moves_page(model: &gtk::StringList) -> (gtk::Box, gtk::Label, MoveFilterWidgets) {
    let page = page_box();
    let toolbar = toolbar_card();
    let type_filter = dropdown_from_options(&type_filter_labels());
    let class_filter = dropdown_from_static(MOVE_CLASS_OPTIONS);
    let min_power_filter = dropdown_from_static(MOVE_MIN_POWER_LABELS);
    let max_power_filter = dropdown_from_static(MOVE_MAX_POWER_LABELS);
    toolbar.append(type_filter.widget());
    toolbar.append(class_filter.widget());
    toolbar.append(min_power_filter.widget());
    toolbar.append(max_power_filter.widget());
    let count = count_label();
    toolbar.append(&count);
    page.append(&toolbar);

    let panel = gtk::Box::new(gtk::Orientation::Vertical, 0);
    panel.add_css_class("section-card");
    panel.set_vexpand(true);
    panel.append(&simple_header(&[
        ("Type", 92, false),
        ("Name", 150, true),
        ("Class", 92, false),
        ("Power", 54, false),
        ("Acc.", 52, false),
        ("PP", 42, false),
    ]));

    let factory = build_move_factory();
    let selection = gtk::SingleSelection::new(Some(model.clone()));
    let list = gtk::ListView::new(Some(selection), Some(factory));
    list.add_css_class("data-list");
    list.set_halign(gtk::Align::Fill);
    list.set_hexpand(true);
    list.set_vexpand(true);
    let scroller = table_scroller(&list);
    panel.append(&scroller);
    page.append(&panel);

    (
        page,
        count,
        MoveFilterWidgets {
            type_filter,
            class_filter,
            min_power_filter,
            max_power_filter,
        },
    )
}

fn build_abilities_page(
    abilities: &[AbilitySummary],
) -> (gtk::Box, gtk::FlowBox, gtk::Label, AbilityFilterWidgets) {
    let page = page_box();
    let toolbar = toolbar_card();
    let title = gtk::Label::new(Some("Abilities"));
    title.add_css_class("header-title");
    title.set_xalign(0.0);
    toolbar.append(&title);
    let generations = ability_generation_keys(abilities);
    let generation_filter = dropdown_from_options(&generation_filter_labels(&generations));
    toolbar.append(generation_filter.widget());
    let count = count_label();
    toolbar.append(&count);
    page.append(&toolbar);

    let flow = gtk::FlowBox::builder()
        .selection_mode(gtk::SelectionMode::Single)
        .activate_on_single_click(true)
        .column_spacing(14)
        .row_spacing(14)
        .min_children_per_line(1)
        .max_children_per_line(4)
        .vexpand(true)
        .build();

    let scroller = gtk::ScrolledWindow::builder()
        .hscrollbar_policy(gtk::PolicyType::Automatic)
        .vexpand(true)
        .child(&flow)
        .build();
    page.append(&scroller);

    (
        page,
        flow,
        count,
        AbilityFilterWidgets {
            generation_filter,
            generations: Rc::new(generations),
        },
    )
}

fn build_items_page(
    model: &gtk::StringList,
    items: &[ItemSummary],
) -> (gtk::Box, gtk::Label, ItemFilterWidgets) {
    let page = page_box();
    let toolbar = toolbar_card();
    let categories = item_category_keys(items);
    let category_filter = dropdown_from_options(&category_filter_labels(&categories));
    toolbar.append(category_filter.widget());
    let count = count_label();
    toolbar.append(&count);
    page.append(&toolbar);

    let panel = gtk::Box::new(gtk::Orientation::Vertical, 0);
    panel.add_css_class("section-card");
    panel.set_vexpand(true);
    panel.append(&simple_header(&[
        ("Name", 140, false),
        ("Category", 110, false),
        ("Effect", 190, true),
    ]));

    let factory = build_item_factory();
    let selection = gtk::SingleSelection::new(Some(model.clone()));
    let list = gtk::ListView::new(Some(selection), Some(factory));
    list.add_css_class("data-list");
    list.set_halign(gtk::Align::Fill);
    list.set_hexpand(true);
    list.set_vexpand(true);
    let scroller = table_scroller(&list);
    panel.append(&scroller);
    page.append(&panel);

    (
        page,
        count,
        ItemFilterWidgets {
            category_filter,
            categories: Rc::new(categories),
        },
    )
}

fn build_natures_page(model: &gtk::StringList) -> (gtk::Box, gtk::Label, NatureFilterWidgets) {
    let page = page_box();
    let toolbar = toolbar_card();
    let title = gtk::Label::new(Some("Natures"));
    title.add_css_class("header-title");
    toolbar.append(&title);
    let stat_filter = dropdown_from_options(&nature_stat_labels());
    toolbar.append(stat_filter.widget());
    let count = count_label();
    toolbar.append(&count);
    page.append(&toolbar);

    let panel = gtk::Box::new(gtk::Orientation::Vertical, 0);
    panel.add_css_class("section-card");
    panel.set_vexpand(true);
    panel.append(&simple_header(&[
        ("Nature", 96, false),
        ("Increased", 86, false),
        ("Decreased", 86, false),
        ("Likes", 58, false),
        ("Hates", 58, true),
    ]));

    let factory = build_nature_factory();
    let selection = gtk::SingleSelection::new(Some(model.clone()));
    let list = gtk::ListView::new(Some(selection), Some(factory));
    list.add_css_class("data-list");
    list.set_halign(gtk::Align::Fill);
    list.set_hexpand(true);
    list.set_vexpand(true);
    let scroller = table_scroller(&list);
    panel.append(&scroller);
    page.append(&panel);

    (page, count, NatureFilterWidgets { stat_filter })
}

fn build_types_page() -> gtk::Box {
    let page = page_box();
    let clamp = adw::Clamp::builder().maximum_size(980).build();
    let content = gtk::Box::new(gtk::Orientation::Vertical, 18);
    content.set_margin_top(10);

    let title = gtk::Label::new(Some("Type Calculator"));
    title.add_css_class("header-title");
    title.set_xalign(0.0);
    content.append(&title);

    let selected1: Rc<RefCell<Option<String>>> = Rc::new(RefCell::new(None));
    let selected2: Rc<RefCell<Option<String>>> = Rc::new(RefCell::new(None));

    let selector = gtk::Box::new(gtk::Orientation::Vertical, 12);
    selector.add_css_class("section-card");
    selector.add_css_class("detail-content-card");
    selector.set_margin_top(4);
    selector.set_margin_bottom(6);
    selector.set_margin_start(0);
    selector.set_margin_end(0);

    let type1_label = gtk::Label::new(Some("Type 1"));
    type1_label.add_css_class("sidebar-section");
    type1_label.set_xalign(0.0);
    selector.append(&type1_label);

    let type1_grid = gtk::FlowBox::builder()
        .selection_mode(gtk::SelectionMode::None)
        .column_spacing(6)
        .row_spacing(6)
        .min_children_per_line(2)
        .max_children_per_line(9)
        .build();
    type1_grid.add_css_class("type-flow");
    let result = gtk::Box::new(gtk::Orientation::Vertical, 12);
    result.add_css_class("section-card");
    result.add_css_class("detail-content-card");
    for type_key in ALL_TYPES {
        let button = type_select_button(type_key);
        let selected1_for_click = selected1.clone();
        let selected2_for_click = selected2.clone();
        let result_for_click = result.clone();
        let type_key = (*type_key).to_owned();
        button.connect_clicked(move |_| {
            let mut current = selected1_for_click.borrow_mut();
            if current.as_deref() == Some(type_key.as_str()) {
                *current = None;
                selected2_for_click.replace(None);
            } else {
                *current = Some(type_key.clone());
                if selected2_for_click.borrow().as_deref() == Some(type_key.as_str()) {
                    selected2_for_click.replace(None);
                }
            }
            drop(current);
            refresh_type_results(
                &result_for_click,
                &selected1_for_click,
                &selected2_for_click,
            );
        });
        type1_grid.append(&button);
    }
    selector.append(&type1_grid);

    let type2_label = gtk::Label::new(Some("Type 2 (optional)"));
    type2_label.add_css_class("sidebar-section");
    type2_label.set_xalign(0.0);
    selector.append(&type2_label);

    let type2_grid = gtk::FlowBox::builder()
        .selection_mode(gtk::SelectionMode::None)
        .column_spacing(6)
        .row_spacing(6)
        .min_children_per_line(2)
        .max_children_per_line(9)
        .build();
    type2_grid.add_css_class("type-flow");
    for type_key in ALL_TYPES {
        let button = type_select_button(type_key);
        let selected1_for_click = selected1.clone();
        let selected2_for_click = selected2.clone();
        let result_for_click = result.clone();
        let type_key = (*type_key).to_owned();
        button.connect_clicked(move |_| {
            if selected1_for_click.borrow().is_none()
                || selected1_for_click.borrow().as_deref() == Some(type_key.as_str())
            {
                return;
            }
            let mut current = selected2_for_click.borrow_mut();
            if current.as_deref() == Some(type_key.as_str()) {
                *current = None;
            } else {
                *current = Some(type_key.clone());
            }
            drop(current);
            refresh_type_results(
                &result_for_click,
                &selected1_for_click,
                &selected2_for_click,
            );
        });
        type2_grid.append(&button);
    }
    selector.append(&type2_grid);
    content.append(&selector);

    refresh_type_results(&result, &selected1, &selected2);
    content.append(&result);

    let chart_section = detail_section("Full Type Chart");
    let chart_scroller = gtk::ScrolledWindow::builder()
        .hscrollbar_policy(gtk::PolicyType::Automatic)
        .vscrollbar_policy(gtk::PolicyType::Never)
        .min_content_height(360)
        .child(&build_type_chart_grid())
        .build();
    chart_section.append(&chart_scroller);
    content.append(&chart_section);

    clamp.set_child(Some(&content));
    let scroller = gtk::ScrolledWindow::builder()
        .hscrollbar_policy(gtk::PolicyType::Never)
        .vscrollbar_policy(gtk::PolicyType::Automatic)
        .vexpand(true)
        .child(&clamp)
        .build();
    page.append(&scroller);
    page
}

fn type_select_button(type_key: &str) -> gtk::Button {
    let button = gtk::Button::new();
    button.add_css_class("flat");
    button.add_css_class("type-choice");
    button.set_child(Some(&type_pill(type_key)));
    button
}

fn refresh_type_results(
    result: &gtk::Box,
    selected1: &Rc<RefCell<Option<String>>>,
    selected2: &Rc<RefCell<Option<String>>>,
) {
    clear_box(result);
    let Some(type1) = selected1.borrow().clone() else {
        result.append(&info_row(
            "dialog-information-symbolic",
            "Select a defending type to see weaknesses, resistances, and immunities.",
        ));
        return;
    };

    let type2 = selected2.borrow().clone();
    let defending = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    defending.append(&gtk::Label::new(Some("Defending:")));
    append_type_pill(&defending, Some(type1.as_str()));
    append_type_pill(&defending, type2.as_deref());
    result.append(&defending);

    for (factor, types) in defensive_buckets(type1.as_str(), type2.as_deref(), None)
        .into_iter()
        .rev()
    {
        if types.is_empty() {
            continue;
        }
        let label = match factor {
            400 => "Super effective (4x)".to_owned(),
            200 => "Effective (2x)".to_owned(),
            100 => "Normal (1x)".to_owned(),
            50 => "Resisted (0.5x)".to_owned(),
            25 => "Double resisted (0.25x)".to_owned(),
            0 => "Immune (0x)".to_owned(),
            _ => factor_label(factor),
        };
        let row = gtk::Box::new(gtk::Orientation::Vertical, 8);
        row.add_css_class("matchup-row");
        if factor > 100 {
            row.add_css_class("matchup-bad");
        } else if factor < 100 {
            row.add_css_class("matchup-good");
        } else {
            row.add_css_class("matchup-neutral");
        }
        let name = gtk::Label::new(Some(&label));
        name.add_css_class("row-title");
        name.set_xalign(0.0);
        row.append(&name);
        let flow = gtk::FlowBox::builder()
            .selection_mode(gtk::SelectionMode::None)
            .column_spacing(6)
            .row_spacing(6)
            .min_children_per_line(1)
            .max_children_per_line(12)
            .build();
        flow.add_css_class("type-flow");
        for type_key in types {
            flow.append(&type_pill(type_key));
        }
        row.append(&flow);
        result.append(&row);
    }
}

#[derive(Clone)]
struct TypeChartHeader {
    type_key: String,
    label: gtk::Label,
}

#[derive(Clone)]
struct TypeChartCell {
    attacking: String,
    defending: String,
    label: gtk::Label,
}

fn build_type_chart_grid() -> gtk::Grid {
    let grid = gtk::Grid::new();
    grid.add_css_class("section-card");
    grid.add_css_class("chart-grid");
    grid.set_column_spacing(3);
    grid.set_row_spacing(3);
    grid.attach(&compare_label("ATK\\DEF", true), 0, 0, 1, 1);
    let mut column_headers = Vec::new();
    for (col, type_key) in ALL_TYPES.iter().enumerate() {
        let header = type_text_label(type_key);
        header.add_css_class("chart-axis");
        grid.attach(&header, (col + 1) as i32, 0, 1, 1);
        column_headers.push(TypeChartHeader {
            type_key: (*type_key).to_owned(),
            label: header,
        });
    }
    let mut row_headers = Vec::new();
    let mut cells = Vec::new();
    for (row_idx, attacking) in ALL_TYPES.iter().enumerate() {
        let row_header = type_text_label(attacking);
        row_header.add_css_class("chart-axis");
        grid.attach(&row_header, 0, (row_idx + 1) as i32, 1, 1);
        row_headers.push(TypeChartHeader {
            type_key: (*attacking).to_owned(),
            label: row_header.clone(),
        });
        for (col_idx, defending) in ALL_TYPES.iter().enumerate() {
            let factor = (type_factor(attacking, defending) * 100.0).round() as i32;
            let label = chart_factor_cell(*attacking, *defending, factor);
            let row_focus = row_header.clone();
            let col_focus = column_headers[col_idx].label.clone();
            let cell_focus = label.clone();
            let motion = gtk::EventControllerMotion::new();
            motion.connect_enter(move |_, _, _| {
                row_focus.add_css_class("chart-focus");
                col_focus.add_css_class("chart-focus");
                cell_focus.add_css_class("chart-focus");
            });
            let row_focus = row_header.clone();
            let col_focus = column_headers[col_idx].label.clone();
            let cell_focus = label.clone();
            motion.connect_leave(move |_| {
                row_focus.remove_css_class("chart-focus");
                col_focus.remove_css_class("chart-focus");
                cell_focus.remove_css_class("chart-focus");
            });
            label.add_controller(motion);
            grid.attach(&label, (col_idx + 1) as i32, (row_idx + 1) as i32, 1, 1);
            cells.push(TypeChartCell {
                attacking: (*attacking).to_owned(),
                defending: (*defending).to_owned(),
                label,
            });
        }
    }

    let row_headers = Rc::new(row_headers);
    let column_headers = Rc::new(column_headers);
    let cells = Rc::new(cells);
    let selected_cells: Rc<RefCell<HashSet<String>>> = Rc::new(RefCell::new(HashSet::new()));
    let mass_selected_rows: Rc<RefCell<HashSet<String>>> = Rc::new(RefCell::new(HashSet::new()));
    let mass_selected_columns: Rc<RefCell<HashSet<String>>> = Rc::new(RefCell::new(HashSet::new()));
    let pinned_rows: Rc<RefCell<HashSet<String>>> = Rc::new(RefCell::new(HashSet::new()));
    let pinned_columns: Rc<RefCell<HashSet<String>>> = Rc::new(RefCell::new(HashSet::new()));

    for header in row_headers.iter() {
        let selected_cells_for_click = selected_cells.clone();
        let mass_selected_rows_for_click = mass_selected_rows.clone();
        let mass_selected_columns_for_click = mass_selected_columns.clone();
        let pinned_rows_for_click = pinned_rows.clone();
        let pinned_columns_for_click = pinned_columns.clone();
        let row_headers_for_click = row_headers.clone();
        let column_headers_for_click = column_headers.clone();
        let cells_for_click = cells.clone();
        let type_key = header.type_key.clone();
        let click = gtk::GestureClick::new();
        click.connect_released(move |gesture, _, _, _| {
            if gesture
                .current_event_state()
                .contains(gtk::gdk::ModifierType::SHIFT_MASK)
            {
                toggle_chart_axis(
                    &selected_cells_for_click,
                    &mass_selected_rows_for_click,
                    &type_key,
                    ChartAxis::Attack,
                );
            } else {
                toggle_hash_selection(&pinned_rows_for_click, &type_key);
            }
            refresh_type_chart_selection(
                row_headers_for_click.as_slice(),
                column_headers_for_click.as_slice(),
                cells_for_click.as_slice(),
                &selected_cells_for_click.borrow(),
                &mass_selected_rows_for_click.borrow(),
                &mass_selected_columns_for_click.borrow(),
                &pinned_rows_for_click.borrow(),
                &pinned_columns_for_click.borrow(),
            );
        });
        header.label.add_controller(click);
    }

    for header in column_headers.iter() {
        let selected_cells_for_click = selected_cells.clone();
        let mass_selected_rows_for_click = mass_selected_rows.clone();
        let mass_selected_columns_for_click = mass_selected_columns.clone();
        let pinned_rows_for_click = pinned_rows.clone();
        let pinned_columns_for_click = pinned_columns.clone();
        let row_headers_for_click = row_headers.clone();
        let column_headers_for_click = column_headers.clone();
        let cells_for_click = cells.clone();
        let type_key = header.type_key.clone();
        let click = gtk::GestureClick::new();
        click.connect_released(move |gesture, _, _, _| {
            if gesture
                .current_event_state()
                .contains(gtk::gdk::ModifierType::SHIFT_MASK)
            {
                toggle_chart_axis(
                    &selected_cells_for_click,
                    &mass_selected_columns_for_click,
                    &type_key,
                    ChartAxis::Defense,
                );
            } else {
                toggle_hash_selection(&pinned_columns_for_click, &type_key);
            }
            refresh_type_chart_selection(
                row_headers_for_click.as_slice(),
                column_headers_for_click.as_slice(),
                cells_for_click.as_slice(),
                &selected_cells_for_click.borrow(),
                &mass_selected_rows_for_click.borrow(),
                &mass_selected_columns_for_click.borrow(),
                &pinned_rows_for_click.borrow(),
                &pinned_columns_for_click.borrow(),
            );
        });
        header.label.add_controller(click);
    }

    for cell in cells.iter() {
        let selected_cells_for_click = selected_cells.clone();
        let mass_selected_rows_for_click = mass_selected_rows.clone();
        let mass_selected_columns_for_click = mass_selected_columns.clone();
        let pinned_rows_for_click = pinned_rows.clone();
        let pinned_columns_for_click = pinned_columns.clone();
        let row_headers_for_click = row_headers.clone();
        let column_headers_for_click = column_headers.clone();
        let cells_for_click = cells.clone();
        let attacking = cell.attacking.clone();
        let defending = cell.defending.clone();
        let click = gtk::GestureClick::new();
        click.connect_released(move |_, _, _, _| {
            toggle_chart_cell(&selected_cells_for_click, &attacking, &defending);
            remove_empty_mass_axes(
                &selected_cells_for_click.borrow(),
                &mass_selected_rows_for_click,
                ChartAxis::Attack,
            );
            remove_empty_mass_axes(
                &selected_cells_for_click.borrow(),
                &mass_selected_columns_for_click,
                ChartAxis::Defense,
            );
            refresh_type_chart_selection(
                row_headers_for_click.as_slice(),
                column_headers_for_click.as_slice(),
                cells_for_click.as_slice(),
                &selected_cells_for_click.borrow(),
                &mass_selected_rows_for_click.borrow(),
                &mass_selected_columns_for_click.borrow(),
                &pinned_rows_for_click.borrow(),
                &pinned_columns_for_click.borrow(),
            );
        });
        cell.label.add_controller(click);
    }

    grid
}

#[derive(Clone, Copy)]
enum ChartAxis {
    Attack,
    Defense,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum ChartAxisState {
    Empty,
    Partial,
    Full,
}

fn chart_cell_key(attacking: &str, defending: &str) -> String {
    format!("{attacking}|{defending}")
}

fn chart_axis_cell_keys(type_key: &str, axis: ChartAxis) -> Vec<String> {
    ALL_TYPES
        .iter()
        .map(|other_type| match axis {
            ChartAxis::Attack => chart_cell_key(type_key, other_type),
            ChartAxis::Defense => chart_cell_key(other_type, type_key),
        })
        .collect()
}

fn chart_axis_state(
    selected_cells: &HashSet<String>,
    type_key: &str,
    axis: ChartAxis,
) -> ChartAxisState {
    let selected_count = chart_axis_cell_keys(type_key, axis)
        .iter()
        .filter(|cell_key| selected_cells.contains(*cell_key))
        .count();

    if selected_count == 0 {
        ChartAxisState::Empty
    } else if selected_count == ALL_TYPES.len() {
        ChartAxisState::Full
    } else {
        ChartAxisState::Partial
    }
}

fn toggle_chart_axis(
    selected_cells: &Rc<RefCell<HashSet<String>>>,
    mass_selected_axes: &Rc<RefCell<HashSet<String>>>,
    type_key: &str,
    axis: ChartAxis,
) {
    let axis_cell_keys = chart_axis_cell_keys(type_key, axis);
    let mut selected_cells = selected_cells.borrow_mut();
    let is_full_axis = axis_cell_keys
        .iter()
        .all(|cell_key| selected_cells.contains(cell_key));

    for cell_key in axis_cell_keys {
        if is_full_axis {
            selected_cells.remove(&cell_key);
        } else {
            selected_cells.insert(cell_key);
        }
    }
    drop(selected_cells);

    let mut mass_selected_axes = mass_selected_axes.borrow_mut();
    if is_full_axis {
        mass_selected_axes.remove(type_key);
    } else {
        mass_selected_axes.insert(type_key.to_owned());
    }
}

fn toggle_chart_cell(
    selected_cells: &Rc<RefCell<HashSet<String>>>,
    attacking: &str,
    defending: &str,
) {
    let cell_key = chart_cell_key(attacking, defending);
    let mut selected_cells = selected_cells.borrow_mut();
    if !selected_cells.insert(cell_key.clone()) {
        selected_cells.remove(&cell_key);
    }
}

fn toggle_hash_selection(selection: &Rc<RefCell<HashSet<String>>>, type_key: &str) {
    let mut selection = selection.borrow_mut();
    if !selection.insert(type_key.to_owned()) {
        selection.remove(type_key);
    }
}

fn remove_empty_mass_axes(
    selected_cells: &HashSet<String>,
    mass_selected_axes: &Rc<RefCell<HashSet<String>>>,
    axis: ChartAxis,
) {
    mass_selected_axes.borrow_mut().retain(|type_key| {
        chart_axis_state(selected_cells, type_key, axis) != ChartAxisState::Empty
    });
}

fn refresh_type_chart_selection(
    row_headers: &[TypeChartHeader],
    column_headers: &[TypeChartHeader],
    cells: &[TypeChartCell],
    selected_cells: &HashSet<String>,
    mass_selected_rows: &HashSet<String>,
    mass_selected_columns: &HashSet<String>,
    pinned_rows: &HashSet<String>,
    pinned_columns: &HashSet<String>,
) {
    let has_selection =
        !selected_cells.is_empty() || !pinned_rows.is_empty() || !pinned_columns.is_empty();
    let mut active_rows = HashSet::new();
    let mut active_columns = HashSet::new();
    let mut selected_cell_rows = HashSet::new();
    let mut selected_cell_columns = HashSet::new();

    for cell_key in selected_cells {
        if let Some((attacking, defending)) = cell_key.split_once('|') {
            selected_cell_rows.insert(attacking.to_owned());
            selected_cell_columns.insert(defending.to_owned());
        }
    }

    active_rows.extend(mass_selected_rows.iter().cloned());
    active_columns.extend(mass_selected_columns.iter().cloned());
    active_rows.extend(pinned_rows.iter().cloned());
    active_columns.extend(pinned_columns.iter().cloned());
    active_rows.extend(selected_cell_rows.iter().cloned());
    active_columns.extend(selected_cell_columns.iter().cloned());

    for header in row_headers {
        let axis_state = if mass_selected_rows.contains(&header.type_key) {
            chart_axis_state(selected_cells, &header.type_key, ChartAxis::Attack)
        } else {
            ChartAxisState::Empty
        };
        let is_pinned = pinned_rows.contains(&header.type_key);
        let has_selected_cell = selected_cell_rows.contains(&header.type_key);
        set_css_class(
            &header.label,
            "chart-selected-axis",
            axis_state == ChartAxisState::Full,
        );
        set_css_class(
            &header.label,
            "chart-partial-axis",
            axis_state == ChartAxisState::Partial,
        );
        set_css_class(&header.label, "chart-cell-axis", has_selected_cell);
        set_css_class(&header.label, "chart-pinned-axis", is_pinned);
        set_css_class(
            &header.label,
            "chart-muted",
            has_selection
                && axis_state == ChartAxisState::Empty
                && !is_pinned
                && !has_selected_cell,
        );
    }

    for header in column_headers {
        let axis_state = if mass_selected_columns.contains(&header.type_key) {
            chart_axis_state(selected_cells, &header.type_key, ChartAxis::Defense)
        } else {
            ChartAxisState::Empty
        };
        let is_pinned = pinned_columns.contains(&header.type_key);
        let has_selected_cell = selected_cell_columns.contains(&header.type_key);
        set_css_class(
            &header.label,
            "chart-selected-axis",
            axis_state == ChartAxisState::Full,
        );
        set_css_class(
            &header.label,
            "chart-partial-axis",
            axis_state == ChartAxisState::Partial,
        );
        set_css_class(&header.label, "chart-cell-axis", has_selected_cell);
        set_css_class(&header.label, "chart-pinned-axis", is_pinned);
        set_css_class(
            &header.label,
            "chart-muted",
            has_selection
                && axis_state == ChartAxisState::Empty
                && !is_pinned
                && !has_selected_cell,
        );
    }

    for cell in cells {
        let selected_cell =
            selected_cells.contains(&chart_cell_key(&cell.attacking, &cell.defending));
        let axis_context =
            active_rows.contains(&cell.attacking) || active_columns.contains(&cell.defending);
        let pinned_axis =
            pinned_rows.contains(&cell.attacking) || pinned_columns.contains(&cell.defending);
        set_css_class(&cell.label, "chart-selected-axis", axis_context);
        set_css_class(&cell.label, "chart-pinned-axis", pinned_axis);
        set_css_class(&cell.label, "chart-selected-intersection", selected_cell);
        set_css_class(
            &cell.label,
            "chart-muted",
            has_selection && !selected_cell && !axis_context,
        );
    }
}

fn set_css_class<W: IsA<gtk::Widget>>(widget: &W, css_class: &str, active: bool) {
    if active {
        widget.add_css_class(css_class);
    } else {
        widget.remove_css_class(css_class);
    }
}

fn type_text_label(type_key: &str) -> gtk::Label {
    let label = gtk::Label::new(Some(&type_key.chars().take(3).collect::<String>()));
    label.add_css_class("type-text");
    label.add_css_class(&format!("type-text-{type_key}"));
    label.set_width_request(42);
    label.set_halign(gtk::Align::Center);
    label.set_tooltip_text(Some(&native::titleize_key(type_key)));
    label
}

fn chart_factor_cell(attacking: &str, defending: &str, factor: i32) -> gtk::Label {
    let label = gtk::Label::new(Some(match factor {
        0 => "0",
        50 => "½",
        200 => "2",
        400 => "4",
        _ => "",
    }));
    label.add_css_class("chart-cell");
    if factor == 0 {
        label.add_css_class("chart-immune");
    } else if factor > 100 {
        label.add_css_class("chart-super");
    } else if factor < 100 {
        label.add_css_class("chart-resist");
    }
    label.set_tooltip_text(Some(&format!(
        "{} into {}: {}",
        native::titleize_key(attacking),
        native::titleize_key(defending),
        factor_label(factor)
    )));
    label
}

fn build_compare_page() -> (gtk::Box, CompareWidgets) {
    let page = page_box();
    let title_row = gtk::Box::new(gtk::Orientation::Horizontal, 10);
    let title = gtk::Label::new(Some("Compare"));
    title.add_css_class("header-title");
    title.set_xalign(0.0);
    title.set_hexpand(true);
    title_row.append(&title);
    page.append(&title_row);

    let selected = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    selected.add_css_class("toolbar-card");
    selected.set_visible(false);
    page.append(&selected);

    let panel = adw::Bin::new();
    let scroller = gtk::ScrolledWindow::builder()
        .hscrollbar_policy(gtk::PolicyType::Automatic)
        .vscrollbar_policy(gtk::PolicyType::Automatic)
        .vexpand(true)
        .child(&panel)
        .build();
    page.append(&scroller);

    (
        page,
        CompareWidgets {
            title,
            selected,
            panel,
        },
    )
}

fn render_compare_page(
    compare: &CompareWidgets,
    all_pokemon: Rc<Vec<PokemonSummary>>,
    compare_ids: Rc<RefCell<Vec<i64>>>,
    compare_badge: gtk::Label,
    sprite_loader: SpriteLoader,
) {
    let ids = compare_ids.borrow().clone();
    update_compare_badge(&compare_badge, ids.len());
    compare
        .title
        .set_text(&format!("Compare ({}/{COMPARE_LIMIT})", ids.len()));

    let picks = ids
        .iter()
        .filter_map(|id| all_pokemon.iter().find(|pokemon| pokemon.id == *id))
        .collect::<Vec<_>>();

    clear_box(&compare.selected);
    compare.selected.set_visible(!picks.is_empty());
    for pokemon in &picks {
        compare.selected.append(&compare_chip(
            pokemon,
            &all_pokemon,
            &compare_ids,
            &compare_badge,
            &compare,
            &sprite_loader,
        ));
    }

    if picks.is_empty() {
        let empty = gtk::Box::new(gtk::Orientation::Vertical, 8);
        empty.add_css_class("section-card");
        empty.add_css_class("compare-empty");
        let title = gtk::Label::new(Some("No Pokemon selected."));
        title.add_css_class("row-title");
        title.set_xalign(0.0);
        empty.append(&title);
        compare.panel.set_child(Some(&empty));
        return;
    }

    let panel = gtk::Grid::new();
    panel.add_css_class("section-card");
    panel.add_css_class("detail-content-card");
    panel.set_column_spacing(8);
    panel.set_row_spacing(8);
    panel.set_vexpand(false);
    panel.attach(&compare_label("Stat", true), 0, 0, 1, 1);

    for (col, pokemon) in picks.iter().enumerate() {
        panel.attach(
            &compare_pokemon_header(pokemon, &sprite_loader),
            (col + 1) as i32,
            0,
            1,
            1,
        );
    }

    let rows = [
        ("Types", "types"),
        ("HP", "hp"),
        ("Atk", "atk"),
        ("Def", "def"),
        ("SpA", "spa"),
        ("SpD", "spd"),
        ("Spe", "spe"),
        ("BST", "bst"),
        ("Weak", "weak"),
        ("Resist", "resist"),
        ("Immune", "immune"),
    ];
    for (row_idx, (label, key)) in rows.iter().enumerate() {
        panel.attach(&compare_label(label, false), 0, (row_idx + 1) as i32, 1, 1);
        for (col, pokemon) in picks.iter().enumerate() {
            let cell = if *key == "types" {
                let types = gtk::Box::new(gtk::Orientation::Horizontal, 6);
                append_type_pill(&types, pokemon.type1_key.as_deref());
                append_type_pill(&types, pokemon.type2_key.as_deref());
                types.upcast::<gtk::Widget>()
            } else if matches!(*key, "weak" | "resist" | "immune") {
                compare_matchup_cell(pokemon, key).upcast()
            } else {
                compare_label(&pokemon_stat_value(pokemon, key), false).upcast()
            };
            panel.attach(&cell, (col + 1) as i32, (row_idx + 1) as i32, 1, 1);
        }
    }

    compare.panel.set_child(Some(&panel));
}

fn compare_chip(
    pokemon: &PokemonSummary,
    all_pokemon: &Rc<Vec<PokemonSummary>>,
    compare_ids: &Rc<RefCell<Vec<i64>>>,
    compare_badge: &gtk::Label,
    compare: &CompareWidgets,
    sprite_loader: &SpriteLoader,
) -> gtk::Box {
    let chip = gtk::Box::new(gtk::Orientation::Horizontal, 6);
    chip.add_css_class("pokemon-chip");
    chip.add_css_class("compact");

    let sprite = gtk::Image::from_icon_name("image-x-generic-symbolic");
    let sprite_url = pokemon_sprite_url(pokemon.id, pokemon.sprite_url.as_deref());
    load_sprite(sprite_loader, &sprite, Some(&sprite_url), 28);
    chip.append(&sprite_frame(&sprite, 32, "sprite-frame"));

    let name = gtk::Label::new(Some(&display_name(pokemon)));
    name.add_css_class("row-title");
    name.set_ellipsize(gtk::pango::EllipsizeMode::End);
    chip.append(&name);

    let remove = gtk::Button::from_icon_name("window-close-symbolic");
    remove.add_css_class("flat");
    remove.set_tooltip_text(Some("Remove"));
    let pokemon_id = pokemon.id;
    let all_pokemon = all_pokemon.clone();
    let compare_ids = compare_ids.clone();
    let compare_badge = compare_badge.clone();
    let compare = compare.clone();
    let sprite_loader = sprite_loader.clone();
    remove.connect_clicked(move |_| {
        compare_ids
            .borrow_mut()
            .retain(|selected_id| *selected_id != pokemon_id);
        render_compare_page(
            &compare,
            all_pokemon.clone(),
            compare_ids.clone(),
            compare_badge.clone(),
            sprite_loader.clone(),
        );
    });
    chip.append(&remove);
    chip
}

fn compare_pokemon_header(pokemon: &PokemonSummary, sprite_loader: &SpriteLoader) -> gtk::Box {
    let header = gtk::Box::new(gtk::Orientation::Vertical, 4);
    header.set_width_request(112);
    let sprite = gtk::Image::from_icon_name("image-x-generic-symbolic");
    let sprite_url = pokemon_sprite_url(pokemon.id, pokemon.sprite_url.as_deref());
    load_sprite(sprite_loader, &sprite, Some(&sprite_url), 48);
    header.append(&sprite);
    let name = gtk::Label::new(Some(&display_name(pokemon)));
    name.add_css_class("row-title");
    name.set_wrap(true);
    name.set_justify(gtk::Justification::Center);
    header.append(&name);
    let id = gtk::Label::new(Some(&format!(
        "#{:03}",
        pokemon.species_id.unwrap_or(pokemon.id)
    )));
    id.add_css_class("dex-id");
    header.append(&id);
    header
}

fn compare_matchup_cell(pokemon: &PokemonSummary, kind: &str) -> gtk::Box {
    let cell = gtk::Box::new(gtk::Orientation::Vertical, 4);
    cell.set_width_request(138);
    cell.set_margin_start(6);
    cell.set_margin_end(6);
    let Some(type1) = pokemon.type1_key.as_deref() else {
        cell.append(&gtk::Label::new(Some("—")));
        return cell;
    };

    let buckets = defensive_buckets(type1, pokemon.type2_key.as_deref(), None);
    let types = match kind {
        "weak" => buckets
            .iter()
            .filter(|(factor, _)| **factor > 100)
            .flat_map(|(_, types)| types.iter().copied())
            .collect::<Vec<_>>(),
        "resist" => buckets
            .iter()
            .filter(|(factor, _)| **factor > 0 && **factor < 100)
            .flat_map(|(_, types)| types.iter().copied())
            .collect::<Vec<_>>(),
        "immune" => buckets.get(&0).cloned().unwrap_or_default(),
        _ => Vec::new(),
    };

    if types.is_empty() {
        let empty = gtk::Label::new(Some("None"));
        empty.add_css_class("muted");
        cell.append(&empty);
    } else {
        let flow = gtk::FlowBox::builder()
            .selection_mode(gtk::SelectionMode::None)
            .column_spacing(6)
            .row_spacing(4)
            .min_children_per_line(1)
            .max_children_per_line(3)
            .build();
        flow.add_css_class("type-flow");
        for type_key in types.iter().take(8) {
            flow.append(&type_text_label(type_key));
        }
        cell.append(&flow);
        if types.len() > 8 {
            cell.append(&metric(&format!("+{}", types.len() - 8)));
        }
    }

    cell
}

fn build_settings_page(data: &LoadedData) -> gtk::Box {
    let page = page_box();
    let clamp = adw::Clamp::builder().maximum_size(920).build();
    let content = gtk::Box::new(gtk::Orientation::Vertical, 14);

    let heading = gtk::Box::new(gtk::Orientation::Vertical, 4);
    let title = gtk::Label::new(Some("Settings"));
    title.add_css_class("detail-title");
    title.set_xalign(0.0);
    let subtitle = gtk::Label::new(Some("Customize the look and behavior of Pokedia."));
    subtitle.add_css_class("muted");
    subtitle.set_xalign(0.0);
    heading.append(&title);
    heading.append(&subtitle);
    content.append(&heading);

    let columns = gtk::Box::new(gtk::Orientation::Horizontal, 14);
    columns.set_homogeneous(true);
    let left_column = gtk::Box::new(gtk::Orientation::Vertical, 14);
    let right_column = gtk::Box::new(gtk::Orientation::Vertical, 14);
    left_column.set_hexpand(true);
    right_column.set_hexpand(true);

    let appearance = settings_card("Appearance", "preferences-desktop-theme-symbolic");
    let theme_row = gtk::Box::new(gtk::Orientation::Horizontal, 10);
    theme_row.append(&choice_button("Dark", true));
    theme_row.append(&choice_button("Light", false));
    appearance.append(&theme_row);
    left_column.append(&appearance);

    let language = settings_card("Language", "preferences-desktop-locale-symbolic");
    language.append(&lang_row("Pokemon names", "EN", "FR"));
    language.append(&lang_row("Move names", "EN", "FR"));
    language.append(&lang_row("Ability names", "EN", "FR"));
    language.append(&lang_row("Item names", "EN", "FR"));
    language.append(&lang_row("Nature names", "EN", "FR"));
    language.append(&lang_row("Descriptions", "EN", "FR"));
    right_column.append(&language);

    let games = settings_card("Game Data", "input-gaming-symbolic");
    if let Some(game) = &data.selected_game {
        games.append(&settings_text_row(
            "Selected game",
            &format!(
                "{}{}",
                game.name_en,
                game.version
                    .as_ref()
                    .map(|version| format!(" v{version}"))
                    .unwrap_or_default()
            ),
        ));
    }
    games.append(&settings_text_row(
        "Available games",
        &data.games.len().to_string(),
    ));
    left_column.append(&games);

    let cache = settings_card("Data Cache", "drive-harddisk-symbolic");
    if data.sync_resources.is_empty() {
        cache.append(&settings_text_row("Status", "No sync status yet"));
    } else {
        for resource in data.sync_resources.iter() {
            cache.append(&sync_resource_row(resource));
        }
    }
    let actions = gtk::Box::new(gtk::Orientation::Horizontal, 10);
    actions.append(&choice_button("Refresh Data", false));
    let clear = choice_button("Clear Cache", false);
    clear.add_css_class("destructive-action");
    actions.append(&clear);
    cache.append(&actions);
    right_column.append(&cache);

    let shortcuts = settings_card("Keyboard Shortcuts", "input-keyboard-symbolic");
    shortcuts.append(&settings_text_row("Ctrl+K", "Focus search bar"));
    shortcuts.append(&settings_text_row("Escape", "Clear search / blur input"));
    shortcuts.append(&settings_text_row("Ctrl+Tab", "Next tab"));
    shortcuts.append(&settings_text_row(
        "Left / Right",
        "Previous / Next Pokemon",
    ));
    left_column.append(&shortcuts);

    let about = settings_card("About", "help-about-symbolic");
    about.append(&settings_text_row("Pokedia", env!("CARGO_PKG_VERSION")));
    about.append(&settings_text_row(
        "Data",
        "PokeAPI plus bundled hackrom datasets",
    ));
    right_column.append(&about);

    columns.append(&left_column);
    columns.append(&right_column);
    content.append(&columns);

    clamp.set_child(Some(&content));
    let scroller = gtk::ScrolledWindow::builder()
        .hscrollbar_policy(gtk::PolicyType::Never)
        .vscrollbar_policy(gtk::PolicyType::Automatic)
        .vexpand(true)
        .child(&clamp)
        .build();
    page.append(&scroller);
    page
}

fn settings_card(title: &str, icon_name: &str) -> gtk::Box {
    let card = gtk::Box::new(gtk::Orientation::Vertical, 10);
    card.add_css_class("section-card");
    card.add_css_class("settings-card");
    card.add_css_class("settings-flow-card");
    card.set_hexpand(true);
    let header = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    let icon = gtk::Image::from_icon_name(icon_name);
    icon.set_pixel_size(16);
    let label = gtk::Label::new(Some(title));
    label.add_css_class("section-title");
    label.set_xalign(0.0);
    header.append(&icon);
    header.append(&label);
    card.append(&header);
    card
}

fn choice_button(label: &str, active: bool) -> gtk::Button {
    let button = button_label(label);
    button.add_css_class("settings-choice");
    if active {
        button.add_css_class("suggested-action");
    }
    button
}

fn lang_row(label: &str, left: &str, right: &str) -> gtk::Box {
    let row = gtk::Box::new(gtk::Orientation::Horizontal, 12);
    row.add_css_class("settings-row");
    let title = gtk::Label::new(Some(label));
    title.set_xalign(0.0);
    title.set_hexpand(true);
    row.append(&title);
    let en = choice_button(left, true);
    let fr = choice_button(right, false);
    row.append(&en);
    row.append(&fr);
    row
}

fn settings_text_row(label: &str, value: &str) -> gtk::Box {
    let row = gtk::Box::new(gtk::Orientation::Horizontal, 12);
    row.add_css_class("settings-row");
    let title = gtk::Label::new(Some(label));
    title.set_xalign(0.0);
    title.set_hexpand(true);
    let value = gtk::Label::new(Some(value));
    value.add_css_class("muted");
    value.set_xalign(1.0);
    value.set_wrap(true);
    row.append(&title);
    row.append(&value);
    row
}

fn sync_resource_row(resource: &SyncResourceStatus) -> gtk::Box {
    let label = resource.resource.replace('_', " ");
    let value = if resource.total > 0 {
        format!(
            "{}/{} ({:.0}%) · {}",
            resource.completed,
            resource.total,
            (resource.completed as f64 / resource.total as f64) * 100.0,
            resource.status
        )
    } else {
        resource.status.clone()
    };
    settings_text_row(&native::titleize_key(&label), &value)
}

fn dropdown_from_static(options: &[&str]) -> FilterDropdown {
    FilterDropdown::new(options.iter().map(|option| (*option).to_owned()).collect())
}

fn dropdown_from_options(options: &[String]) -> FilterDropdown {
    FilterDropdown::new(options.to_vec())
}

fn bind_list_item_selection(item: &gtk::ListItem, row: &gtk::Box) {
    set_data_row_selected(row, item.property::<bool>("selected"));

    let row = row.clone();
    item.connect_selected_notify(move |item| {
        set_data_row_selected(&row, item.property::<bool>("selected"));
    });
}

fn set_data_row_selected(row: &gtk::Box, selected: bool) {
    if selected {
        row.add_css_class("selected-data-row");
    } else {
        row.remove_css_class("selected-data-row");
    }
}

fn type_filter_labels() -> Vec<String> {
    let mut labels = Vec::with_capacity(ALL_TYPES.len() + 1);
    labels.push("All types".to_owned());
    labels.extend(
        ALL_TYPES
            .iter()
            .map(|type_key| native::titleize_key(type_key)),
    );
    labels
}

fn second_type_filter_labels() -> Vec<String> {
    let mut labels = Vec::with_capacity(ALL_TYPES.len() + 1);
    labels.push("+ Any type".to_owned());
    labels.extend(
        ALL_TYPES
            .iter()
            .map(|type_key| native::titleize_key(type_key)),
    );
    labels
}

fn ability_generation_keys(abilities: &[AbilitySummary]) -> Vec<i64> {
    let mut generations = abilities
        .iter()
        .filter_map(|ability| ability.generation)
        .collect::<Vec<_>>();
    generations.sort_unstable();
    generations.dedup();
    generations
}

fn generation_filter_labels(generations: &[i64]) -> Vec<String> {
    let mut labels = Vec::with_capacity(generations.len() + 1);
    labels.push("All generations".to_owned());
    labels.extend(
        generations
            .iter()
            .map(|generation| format!("Gen {generation}")),
    );
    labels
}

fn item_category_keys(items: &[ItemSummary]) -> Vec<String> {
    let mut categories = items
        .iter()
        .filter_map(|item| item.category.as_deref())
        .filter(|category| !category.is_empty())
        .map(ToOwned::to_owned)
        .collect::<Vec<_>>();
    categories.sort();
    categories.dedup();
    categories
}

fn category_filter_labels(categories: &[String]) -> Vec<String> {
    let mut labels = Vec::with_capacity(categories.len() + 1);
    labels.push("All categories".to_owned());
    labels.extend(
        categories
            .iter()
            .map(|category| native::titleize_key(category)),
    );
    labels
}

fn nature_stat_labels() -> Vec<String> {
    let mut labels = Vec::with_capacity(NATURE_STAT_KEYS.len() + 1);
    labels.push("All stats".to_owned());
    labels.extend(NATURE_STAT_KEYS.iter().map(|stat| stat_label(Some(stat))));
    labels
}

fn page_box() -> gtk::Box {
    let page = gtk::Box::new(gtk::Orientation::Vertical, 12);
    page.add_css_class("page");
    page.set_hexpand(true);
    page.set_vexpand(true);
    page.set_margin_top(12);
    page.set_margin_bottom(12);
    page.set_margin_start(10);
    page.set_margin_end(0);
    page
}

fn toolbar_card() -> gtk::Box {
    let toolbar = gtk::Box::new(gtk::Orientation::Horizontal, 6);
    toolbar.add_css_class("toolbar-card");
    toolbar
}

fn table_scroller(child: &impl IsA<gtk::Widget>) -> gtk::ScrolledWindow {
    let scroller = gtk::ScrolledWindow::builder()
        .hscrollbar_policy(gtk::PolicyType::Automatic)
        .vexpand(true)
        .child(child)
        .build();
    scroller.add_css_class("table-scroller");
    scroller.set_overflow(gtk::Overflow::Hidden);
    scroller
}

fn button_label(label: &str) -> gtk::Button {
    let button = gtk::Button::with_label(label);
    button.add_css_class("flat");
    button
}

fn count_label() -> gtk::Label {
    let label = gtk::Label::new(None);
    label.add_css_class("muted");
    label.set_hexpand(true);
    label.set_xalign(1.0);
    label
}

fn add_compare_id(compare_ids: &Rc<RefCell<Vec<i64>>>, pokemon_id: i64) -> bool {
    let mut ids = compare_ids.borrow_mut();
    if ids.contains(&pokemon_id) || ids.len() >= COMPARE_LIMIT {
        return false;
    }
    ids.push(pokemon_id);
    true
}

fn startup_compare_ids() -> Vec<i64> {
    std::env::var("POKEDIA_COMPARE_IDS")
        .ok()
        .map(|value| {
            value
                .split(',')
                .filter_map(|id| id.trim().parse::<i64>().ok())
                .take(COMPARE_LIMIT)
                .fold(Vec::new(), |mut ids, id| {
                    if !ids.contains(&id) {
                        ids.push(id);
                    }
                    ids
                })
        })
        .unwrap_or_default()
}

fn update_compare_badge(badge: &gtk::Label, count: usize) {
    badge.set_text(&count.to_string());
    badge.set_visible(count > 0);
}

fn build_pokemon_header() -> gtk::Box {
    simple_header(&[
        ("", 40, false),
        ("#", 30, false),
        ("Name", 84, true),
        ("Type", 76, false),
        ("HP", 34, false),
        ("Atk", 34, false),
        ("Def", 34, false),
        ("SpA", 34, false),
        ("SpD", 34, false),
        ("Spe", 34, false),
        ("BST", 38, false),
        ("", 26, false),
    ])
}

fn simple_header(columns: &[(&str, i32, bool)]) -> gtk::Box {
    let header = gtk::Box::new(gtk::Orientation::Horizontal, 6);
    header.add_css_class("table-header");
    for (text, width, expand) in columns {
        let label = gtk::Label::new(Some(text));
        label.add_css_class("table-header-cell");
        label.set_width_request(*width);
        label.set_hexpand(*expand);
        label.set_xalign(0.0);
        label.set_ellipsize(gtk::pango::EllipsizeMode::End);
        header.append(&label);
    }
    header
}

fn build_pokemon_factory(
    sprite_loader: SpriteLoader,
    compare_ids: Rc<RefCell<Vec<i64>>>,
    compare_badge: gtk::Label,
) -> gtk::SignalListItemFactory {
    let factory = gtk::SignalListItemFactory::new();

    let setup_compare_ids = compare_ids.clone();
    let setup_compare_badge = compare_badge.clone();
    factory.connect_setup(move |_, item| {
        let item = item.downcast_ref::<gtk::ListItem>().expect("ListItem");
        let row = gtk::Box::new(gtk::Orientation::Horizontal, 6);
        row.add_css_class("data-row");
        bind_list_item_selection(item, &row);
        row.set_halign(gtk::Align::Fill);
        row.set_hexpand(true);

        let sprite = gtk::Image::from_icon_name("image-x-generic-symbolic");
        sprite.set_pixel_size(34);
        row.append(&sprite_frame(&sprite, 40, "sprite-frame"));
        row.append(&sized_label("", 30, false, "dex-id"));

        let name_box = gtk::Box::new(gtk::Orientation::Horizontal, 5);
        name_box.set_width_request(84);
        name_box.set_hexpand(true);
        let name = gtk::Label::new(None);
        name.add_css_class("row-title");
        name.set_xalign(0.0);
        name.set_ellipsize(gtk::pango::EllipsizeMode::End);
        let form = gtk::Label::new(None);
        form.add_css_class("muted");
        form.set_xalign(0.0);
        form.set_ellipsize(gtk::pango::EllipsizeMode::End);
        name_box.append(&name);
        name_box.append(&form);
        row.append(&name_box);

        let types = gtk::Box::new(gtk::Orientation::Horizontal, 6);
        types.set_width_request(76);
        row.append(&types);

        for class_name in [
            "stat-hp", "stat-atk", "stat-def", "stat-spa", "stat-spd", "stat-spe", "stat-bst",
        ] {
            row.append(&sized_label("", 34, false, class_name));
        }

        let add = gtk::Button::from_icon_name("list-add-symbolic");
        add.add_css_class("flat");
        add.set_width_request(26);
        add.set_tooltip_text(Some("Add to compare"));
        let button_compare_ids = setup_compare_ids.clone();
        let button_compare_badge = setup_compare_badge.clone();
        add.connect_clicked(move |button| {
            let Ok(pokemon_id) = button.widget_name().parse::<i64>() else {
                return;
            };
            if add_compare_id(&button_compare_ids, pokemon_id) {
                update_compare_badge(&button_compare_badge, button_compare_ids.borrow().len());
                button.add_css_class("suggested-action");
            }
        });
        row.append(&add);

        item.set_child(Some(&row));
    });

    let bind_sprite_loader = sprite_loader.clone();
    let bind_compare_ids = compare_ids.clone();
    factory.connect_bind(move |_, item| {
        let item = item.downcast_ref::<gtk::ListItem>().expect("ListItem");
        let Some(object) = item.item() else {
            return;
        };
        let Ok(string_object) = object.downcast::<gtk::StringObject>() else {
            return;
        };
        let data = parse_fields(string_object.string().as_str());
        let Some(row) = item.child().and_downcast::<gtk::Box>() else {
            return;
        };
        row.set_widget_name(&format!("pokemon:{}", field(&data, 13)));

        if let Some(sprite) = nth_child(&row, 0)
            .and_downcast::<gtk::Box>()
            .and_then(|frame| nth_child(&frame, 1))
            .and_downcast::<gtk::Image>()
        {
            load_sprite(
                &bind_sprite_loader,
                &sprite,
                optional_field(field(&data, 0)),
                34,
            );
        }

        set_label(&row, 1, field(&data, 1));
        if let Some(name_box) = nth_child(&row, 2).and_downcast::<gtk::Box>() {
            set_label(&name_box, 0, field(&data, 2));
            if let Some(form) = nth_child(&name_box, 1).and_downcast::<gtk::Label>() {
                let value = field(&data, 3);
                form.set_text(value);
                form.set_visible(!value.is_empty());
            }
        }
        if let Some(types) = nth_child(&row, 3).and_downcast::<gtk::Box>() {
            clear_box(&types);
            append_type_pill(&types, optional_field(field(&data, 4)));
            append_type_pill(&types, optional_field(field(&data, 5)));
        }
        for idx in 0..7 {
            set_label(&row, 4 + idx, field(&data, 6 + idx));
        }
        if let Some(add) = nth_child(&row, 11).and_downcast::<gtk::Button>() {
            let pokemon_id = field(&data, 13);
            add.set_widget_name(pokemon_id);
            add.set_tooltip_text(Some("Add to compare"));
            if pokemon_id
                .parse::<i64>()
                .ok()
                .is_some_and(|id| bind_compare_ids.borrow().contains(&id))
            {
                add.add_css_class("suggested-action");
            } else {
                add.remove_css_class("suggested-action");
            }
        }
    });

    factory
}

fn build_move_factory() -> gtk::SignalListItemFactory {
    let factory = gtk::SignalListItemFactory::new();
    factory.connect_setup(|_, item| {
        let item = item.downcast_ref::<gtk::ListItem>().expect("ListItem");
        let row = gtk::Box::new(gtk::Orientation::Horizontal, 8);
        row.add_css_class("data-row");
        bind_list_item_selection(item, &row);
        row.set_halign(gtk::Align::Fill);
        row.set_hexpand(true);
        let types = gtk::Box::new(gtk::Orientation::Horizontal, 6);
        types.set_width_request(92);
        row.append(&types);
        row.append(&sized_label("", 150, true, "row-title"));
        row.append(&sized_label("", 92, false, "muted"));
        row.append(&sized_label("", 54, false, "stat-bst"));
        row.append(&sized_label("", 52, false, "stat-bst"));
        row.append(&sized_label("", 42, false, "stat-bst"));
        item.set_child(Some(&row));
    });
    factory.connect_bind(|_, item| {
        let item = item.downcast_ref::<gtk::ListItem>().expect("ListItem");
        let Some(object) = item.item() else {
            return;
        };
        let Ok(string_object) = object.downcast::<gtk::StringObject>() else {
            return;
        };
        let data = parse_fields(string_object.string().as_str());
        let Some(row) = item.child().and_downcast::<gtk::Box>() else {
            return;
        };
        row.set_widget_name(&format!("move:{}", field(&data, 6)));
        if let Some(types) = nth_child(&row, 0).and_downcast::<gtk::Box>() {
            clear_box(&types);
            append_type_pill(&types, optional_field(field(&data, 1)));
        }
        set_label(&row, 1, field(&data, 0));
        set_label(&row, 2, field(&data, 2));
        set_label(&row, 3, field(&data, 3));
        set_label(&row, 4, field(&data, 4));
        set_label(&row, 5, field(&data, 5));
    });
    factory
}

fn build_item_factory() -> gtk::SignalListItemFactory {
    let factory = gtk::SignalListItemFactory::new();
    factory.connect_setup(|_, item| {
        let item = item.downcast_ref::<gtk::ListItem>().expect("ListItem");
        let row = gtk::Box::new(gtk::Orientation::Horizontal, 8);
        row.add_css_class("data-row");
        bind_list_item_selection(item, &row);
        row.set_halign(gtk::Align::Fill);
        row.set_hexpand(true);
        row.append(&sized_label("", 140, false, "row-title"));
        row.append(&sized_label("", 110, false, "muted"));
        row.append(&sized_label("", 190, true, "muted"));
        item.set_child(Some(&row));
    });
    factory.connect_bind(|_, item| {
        let item = item.downcast_ref::<gtk::ListItem>().expect("ListItem");
        let Some(object) = item.item() else {
            return;
        };
        let Ok(string_object) = object.downcast::<gtk::StringObject>() else {
            return;
        };
        let data = parse_fields(string_object.string().as_str());
        let Some(row) = item.child().and_downcast::<gtk::Box>() else {
            return;
        };
        row.set_widget_name(&format!("item:{}", field(&data, 3)));
        for idx in 0..3 {
            set_label(&row, idx, field(&data, idx));
        }
    });
    factory
}

fn build_nature_factory() -> gtk::SignalListItemFactory {
    let factory = gtk::SignalListItemFactory::new();
    factory.connect_setup(|_, item| {
        let item = item.downcast_ref::<gtk::ListItem>().expect("ListItem");
        let row = gtk::Box::new(gtk::Orientation::Horizontal, 6);
        row.add_css_class("data-row");
        bind_list_item_selection(item, &row);
        row.set_halign(gtk::Align::Fill);
        row.set_hexpand(true);
        row.append(&sized_label("", 96, false, "row-title"));
        row.append(&sized_label("", 86, false, "stat-spd"));
        row.append(&sized_label("", 86, false, "stat-hp"));
        row.append(&sized_label("", 58, false, "muted"));
        row.append(&sized_label("", 58, true, "muted"));
        item.set_child(Some(&row));
    });
    factory.connect_bind(|_, item| {
        let item = item.downcast_ref::<gtk::ListItem>().expect("ListItem");
        let Some(object) = item.item() else {
            return;
        };
        let Ok(string_object) = object.downcast::<gtk::StringObject>() else {
            return;
        };
        let data = parse_fields(string_object.string().as_str());
        let Some(row) = item.child().and_downcast::<gtk::Box>() else {
            return;
        };
        for idx in 0..5 {
            set_label(&row, idx, field(&data, idx));
        }
    });
    factory
}

fn sized_label(text: &str, width: i32, expand: bool, class_name: &str) -> gtk::Label {
    let label = gtk::Label::new(Some(text));
    label.set_width_request(width);
    label.set_hexpand(expand);
    label.set_xalign(0.0);
    label.set_ellipsize(gtk::pango::EllipsizeMode::End);
    label.add_css_class(class_name);
    label
}

fn parse_hex_color(color: &str) -> (f64, f64, f64) {
    let color = color.trim_start_matches('#');
    if color.len() != 6 {
        return (0.45, 0.55, 0.95);
    }
    let red = u8::from_str_radix(&color[0..2], 16).unwrap_or(115);
    let green = u8::from_str_radix(&color[2..4], 16).unwrap_or(140);
    let blue = u8::from_str_radix(&color[4..6], 16).unwrap_or(240);
    (
        f64::from(red) / 255.0,
        f64::from(green) / 255.0,
        f64::from(blue) / 255.0,
    )
}

fn draw_stat_meter(
    cr: &gtk::cairo::Context,
    width: i32,
    height: i32,
    fraction: f64,
    red: f64,
    green: f64,
    blue: f64,
) {
    let width = f64::from(width).max(0.0);
    let height = f64::from(height).max(0.0);
    if width <= 0.0 || height <= 0.0 {
        return;
    }

    let bar_height = height.min(12.0);
    let y = (height - bar_height) / 2.0;
    let radius = bar_height / 2.0;

    rounded_rect(cr, 0.0, y, width, bar_height, radius);
    cr.set_source_rgba(1.0, 1.0, 1.0, 0.07);
    let _ = cr.fill();

    let fill_width = (width * fraction.clamp(0.0, 1.0)).clamp(0.0, width);
    if fill_width <= 0.0 {
        return;
    }

    rounded_rect(cr, 0.0, y, fill_width, bar_height, radius);
    cr.set_source_rgba(red, green, blue, 1.0);
    let _ = cr.fill();
}

fn rounded_rect(cr: &gtk::cairo::Context, x: f64, y: f64, width: f64, height: f64, radius: f64) {
    let radius = radius.min(width / 2.0).min(height / 2.0);
    let right = x + width;
    let bottom = y + height;

    cr.new_sub_path();
    cr.arc(right - radius, y + radius, radius, -PI / 2.0, 0.0);
    cr.arc(right - radius, bottom - radius, radius, 0.0, PI / 2.0);
    cr.arc(x + radius, bottom - radius, radius, PI / 2.0, PI);
    cr.arc(x + radius, y + radius, radius, PI, 3.0 * PI / 2.0);
    cr.close_path();
}

fn sprite_frame(image: &gtk::Image, size: i32, class_name: &str) -> gtk::Box {
    let frame = gtk::Box::new(gtk::Orientation::Vertical, 0);
    frame.add_css_class(class_name);
    frame.set_width_request(size);
    frame.set_height_request(size);
    frame.set_halign(gtk::Align::Center);
    frame.set_valign(gtk::Align::Center);
    frame.set_vexpand(false);
    let top_spacer = gtk::Box::new(gtk::Orientation::Vertical, 0);
    let bottom_spacer = gtk::Box::new(gtk::Orientation::Vertical, 0);
    top_spacer.set_vexpand(true);
    bottom_spacer.set_vexpand(true);
    image.set_halign(gtk::Align::Center);
    image.set_valign(gtk::Align::Center);
    frame.append(&top_spacer);
    frame.append(image);
    frame.append(&bottom_spacer);
    frame
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum PokedexSort {
    Id,
    Name,
    Bst,
    Hp,
    Atk,
    Def,
    Spa,
    Spd,
    Spe,
}

fn dropdown_index(dropdown: &FilterDropdown) -> usize {
    let selected = dropdown.selected();
    if selected == gtk::INVALID_LIST_POSITION {
        0
    } else {
        selected as usize
    }
}

fn selected_type_filter(dropdown: &FilterDropdown) -> Option<&'static str> {
    let index = dropdown_index(dropdown);
    if index == 0 {
        None
    } else {
        ALL_TYPES.get(index - 1).copied()
    }
}

fn selected_pokedex_type_filters(
    filters: &PokedexFilterWidgets,
) -> (Option<&'static str>, Option<&'static str>) {
    (
        selected_type_filter(&filters.type_filter),
        selected_type_filter(&filters.second_type_filter),
    )
}

fn selected_generation_range(dropdown: &FilterDropdown) -> Option<(i64, i64)> {
    let index = dropdown_index(dropdown);
    if index == 0 {
        None
    } else {
        GENERATION_RANGES.get(index - 1).copied()
    }
}

fn selected_pokedex_sort(dropdown: &FilterDropdown) -> PokedexSort {
    match dropdown_index(dropdown) {
        1 => PokedexSort::Name,
        2 => PokedexSort::Bst,
        3 => PokedexSort::Hp,
        4 => PokedexSort::Atk,
        5 => PokedexSort::Def,
        6 => PokedexSort::Spa,
        7 => PokedexSort::Spd,
        8 => PokedexSort::Spe,
        _ => PokedexSort::Id,
    }
}

fn selected_pokedex_sorts(filters: &PokedexFilterWidgets) -> Vec<PokedexSort> {
    let mut sorts = Vec::new();
    for dropdown in &filters.sort_filters {
        if !dropdown.is_visible() {
            continue;
        }
        let sort = selected_pokedex_sort(dropdown);
        if sort != PokedexSort::Id && !sorts.contains(&sort) {
            sorts.push(sort);
        }
    }
    sorts
}

fn update_pokedex_sort_filter_visibility(filters: &PokedexFilterWidgets) {
    let mut previous_is_active_sort = true;
    for (idx, dropdown) in filters.sort_filters.iter().enumerate() {
        if idx == 0 {
            dropdown.set_visible(true);
            previous_is_active_sort = selected_pokedex_sort(dropdown) != PokedexSort::Id;
            continue;
        }

        dropdown.set_visible(previous_is_active_sort);
        if !previous_is_active_sort {
            dropdown.set_selected(0);
        }
        previous_is_active_sort =
            dropdown.is_visible() && selected_pokedex_sort(dropdown) != PokedexSort::Id;
    }
}

fn selected_move_class(dropdown: &FilterDropdown) -> Option<&'static str> {
    match dropdown_index(dropdown) {
        1 => Some("physical"),
        2 => Some("special"),
        3 => Some("status"),
        _ => None,
    }
}

fn selected_power_filter(dropdown: &FilterDropdown, values: &[Option<i64>]) -> Option<i64> {
    values.get(dropdown_index(dropdown)).copied().flatten()
}

fn selected_ability_generation(filters: &AbilityFilterWidgets) -> Option<i64> {
    let index = dropdown_index(&filters.generation_filter);
    if index == 0 {
        None
    } else {
        filters.generations.get(index - 1).copied()
    }
}

fn selected_item_category(filters: &ItemFilterWidgets) -> Option<&str> {
    let index = dropdown_index(&filters.category_filter);
    if index == 0 {
        None
    } else {
        filters.categories.get(index - 1).map(String::as_str)
    }
}

fn selected_nature_stat(dropdown: &FilterDropdown) -> Option<&'static str> {
    let index = dropdown_index(dropdown);
    if index == 0 {
        None
    } else {
        NATURE_STAT_KEYS.get(index - 1).copied()
    }
}

fn compare_pokemon_summary(
    left: &PokemonSummary,
    right: &PokemonSummary,
    sorts: &[PokedexSort],
) -> Ordering {
    let primary = sorts
        .iter()
        .map(|sort| compare_pokemon_sort_field(left, right, *sort))
        .find(|ordering| *ordering != Ordering::Equal)
        .unwrap_or(Ordering::Equal);

    primary
        .then_with(|| {
            left.species_id
                .unwrap_or(left.id)
                .cmp(&right.species_id.unwrap_or(right.id))
        })
        .then_with(|| left.id.cmp(&right.id))
}

fn compare_pokemon_sort_field(
    left: &PokemonSummary,
    right: &PokemonSummary,
    sort: PokedexSort,
) -> Ordering {
    match sort {
        PokedexSort::Id => Ordering::Equal,
        PokedexSort::Name => display_name(left)
            .to_lowercase()
            .cmp(&display_name(right).to_lowercase()),
        PokedexSort::Bst => compare_optional_desc(left.base_stat_total, right.base_stat_total),
        PokedexSort::Hp => compare_optional_desc(left.hp, right.hp),
        PokedexSort::Atk => compare_optional_desc(left.atk, right.atk),
        PokedexSort::Def => compare_optional_desc(left.def, right.def),
        PokedexSort::Spa => compare_optional_desc(left.spa, right.spa),
        PokedexSort::Spd => compare_optional_desc(left.spd, right.spd),
        PokedexSort::Spe => compare_optional_desc(left.spe, right.spe),
    }
}

fn compare_optional_desc(left: Option<i64>, right: Option<i64>) -> Ordering {
    right.unwrap_or(-1).cmp(&left.unwrap_or(-1))
}

fn pokemon_matches_type_filters(
    pokemon: &PokemonSummary,
    type_filter: Option<&str>,
    second_type_filter: Option<&str>,
) -> bool {
    let Some(type_filter) = type_filter else {
        return true;
    };

    let type1 = pokemon.type1_key.as_deref();
    let type2 = pokemon.type2_key.as_deref();
    let has_first = type1 == Some(type_filter) || type2 == Some(type_filter);
    let Some(second_type_filter) = second_type_filter else {
        return has_first;
    };

    if type_filter == second_type_filter {
        return has_first;
    }

    (type1 == Some(type_filter) && type2 == Some(second_type_filter))
        || (type1 == Some(second_type_filter) && type2 == Some(type_filter))
}

fn refresh_all_pages(widgets: &AppWidgets, data: &LoadedData, query: &str) {
    refresh_pokemon_model(widgets, &data.pokemon, query);
    refresh_move_model(widgets, &data.moves, query);
    refresh_ability_flow(widgets, &data.abilities, query);
    refresh_item_model(widgets, &data.items, query);
    refresh_nature_model(widgets, &data.natures, query);
}

fn refresh_visible_page(widgets: &AppWidgets, data: &LoadedData, query: &str) {
    match *widgets.current_page.borrow() {
        Page::Pokedex => refresh_pokemon_model(widgets, &data.pokemon, query),
        Page::Moves => refresh_move_model(widgets, &data.moves, query),
        Page::Abilities => refresh_ability_flow(widgets, &data.abilities, query),
        Page::Items => refresh_item_model(widgets, &data.items, query),
        Page::Natures => refresh_nature_model(widgets, &data.natures, query),
        Page::Types | Page::Compare | Page::Settings => {}
    }
}

fn refresh_pokemon_model(widgets: &AppWidgets, all_pokemon: &[PokemonSummary], query: &str) {
    let (type_filter, second_type_filter) = selected_pokedex_type_filters(&widgets.pokedex_filters);
    let generation_range = selected_generation_range(&widgets.pokedex_filters.generation_filter);
    let sorts = selected_pokedex_sorts(&widgets.pokedex_filters);
    let favorites_only = widgets.pokedex_filters.favorites_filter.is_active();

    let mut rows = all_pokemon
        .iter()
        .filter(|pokemon| native::matches_query(pokemon, query))
        .filter(|pokemon| pokemon_matches_type_filters(pokemon, type_filter, second_type_filter))
        .filter(|pokemon| {
            generation_range.is_none_or(|(min, max)| {
                let base_id = pokemon.species_id.unwrap_or(pokemon.id);
                base_id >= min && base_id <= max
            })
        })
        .filter(|pokemon| {
            !favorites_only
                || widgets.favorite_ids.contains(&pokemon.id)
                || pokemon
                    .species_id
                    .is_some_and(|id| widgets.favorite_ids.contains(&id))
        })
        .cloned()
        .collect::<Vec<_>>();
    rows.sort_by(|left, right| compare_pokemon_summary(left, right, &sorts));

    let strings = rows.iter().map(pokemon_row_string).collect::<Vec<_>>();
    replace_string_list(&widgets.pokemon_model, &strings);
    widgets
        .pokemon_count
        .set_text(&format!("{} Pokemon", rows.len()));
    widgets.filtered_pokemon.replace(rows);
}

fn refresh_move_model(widgets: &AppWidgets, moves: &[MoveSummary], query: &str) {
    let type_filter = selected_type_filter(&widgets.move_filters.type_filter);
    let class_filter = selected_move_class(&widgets.move_filters.class_filter);
    let min_power = selected_power_filter(
        &widgets.move_filters.min_power_filter,
        MOVE_MIN_POWER_VALUES,
    );
    let max_power = selected_power_filter(
        &widgets.move_filters.max_power_filter,
        MOVE_MAX_POWER_VALUES,
    );
    let filtered = moves
        .iter()
        .filter(|move_| {
            text_matches(
                query,
                &[
                    &move_.name_key,
                    move_.name_en.as_deref().unwrap_or_default(),
                    move_.name_fr.as_deref().unwrap_or_default(),
                    move_.type_key.as_deref().unwrap_or_default(),
                ],
            )
        })
        .filter(|move_| {
            type_filter.is_none_or(|type_key| move_.type_key.as_deref() == Some(type_key))
        })
        .filter(|move_| {
            class_filter.is_none_or(|class| move_.damage_class.as_deref() == Some(class))
        })
        .filter(|move_| min_power.is_none_or(|min| move_.power.is_some_and(|power| power >= min)))
        .filter(|move_| max_power.is_none_or(|max| move_.power.is_some_and(|power| power <= max)))
        .collect::<Vec<_>>();
    let rows = filtered
        .iter()
        .map(|move_| move_row_string(move_))
        .collect::<Vec<_>>();
    replace_string_list(&widgets.move_model, &rows);
    widgets
        .move_count
        .set_text(&format!("{} moves", rows.len()));
    widgets
        .filtered_moves
        .replace(filtered.into_iter().cloned().collect());
}

fn refresh_ability_flow(widgets: &AppWidgets, abilities: &[AbilitySummary], query: &str) {
    clear_flow_box(&widgets.ability_flow);
    let mut count = 0;
    let generation_filter = selected_ability_generation(&widgets.ability_filters);
    let filtered = abilities
        .iter()
        .filter(|ability| {
            text_matches(
                query,
                &[
                    &ability.name_key,
                    ability.name_en.as_deref().unwrap_or_default(),
                    ability.name_fr.as_deref().unwrap_or_default(),
                    ability.short_effect_en.as_deref().unwrap_or_default(),
                    ability.short_effect_fr.as_deref().unwrap_or_default(),
                ],
            )
        })
        .filter(|ability| {
            generation_filter.is_none_or(|generation| ability.generation == Some(generation))
        })
        .cloned()
        .collect::<Vec<_>>();

    for ability in &filtered {
        widgets.ability_flow.append(&ability_card(ability));
        count += 1;
    }
    widgets
        .ability_count
        .set_text(&format!("{} abilities", count));
    widgets.filtered_abilities.replace(filtered);
}

fn refresh_item_model(widgets: &AppWidgets, items: &[ItemSummary], query: &str) {
    let category_filter = selected_item_category(&widgets.item_filters);
    let filtered = items
        .iter()
        .filter(|item| {
            text_matches(
                query,
                &[
                    &item.name_key,
                    item.name_en.as_deref().unwrap_or_default(),
                    item.name_fr.as_deref().unwrap_or_default(),
                    item.category.as_deref().unwrap_or_default(),
                    item.effect_en.as_deref().unwrap_or_default(),
                    item.effect_fr.as_deref().unwrap_or_default(),
                ],
            )
        })
        .filter(|item| {
            category_filter.is_none_or(|category| item.category.as_deref() == Some(category))
        })
        .collect::<Vec<_>>();
    let rows = filtered
        .iter()
        .map(|item| item_row_string(item))
        .collect::<Vec<_>>();
    replace_string_list(&widgets.item_model, &rows);
    widgets
        .item_count
        .set_text(&format!("{} items", rows.len()));
    widgets
        .filtered_items
        .replace(filtered.into_iter().cloned().collect());
}

fn refresh_nature_model(widgets: &AppWidgets, natures: &[NatureSummary], query: &str) {
    let stat_filter = selected_nature_stat(&widgets.nature_filters.stat_filter);
    let rows = natures
        .iter()
        .filter(|nature| {
            text_matches(
                query,
                &[
                    &nature.name_key,
                    nature.name_en.as_deref().unwrap_or_default(),
                    nature.name_fr.as_deref().unwrap_or_default(),
                    nature.increased_stat.as_deref().unwrap_or_default(),
                    nature.decreased_stat.as_deref().unwrap_or_default(),
                ],
            )
        })
        .filter(|nature| {
            stat_filter.is_none_or(|stat| {
                nature.increased_stat.as_deref() == Some(stat)
                    || nature.decreased_stat.as_deref() == Some(stat)
            })
        })
        .map(nature_row_string)
        .collect::<Vec<_>>();
    replace_string_list(&widgets.nature_model, &rows);
    widgets
        .nature_count
        .set_text(&format!("{} natures", rows.len()));
}

fn replace_string_list(model: &gtk::StringList, rows: &[String]) {
    let row_refs = rows.iter().map(String::as_str).collect::<Vec<_>>();
    model.splice(0, model.n_items(), &row_refs);
}

fn ability_card(ability: &AbilitySummary) -> gtk::Box {
    let card = gtk::Box::new(gtk::Orientation::Horizontal, 12);
    card.add_css_class("ability-card");
    card.add_css_class("clickable-card");
    card.set_widget_name(&format!("ability:{}", ability.id));
    card.set_width_request(260);
    card.set_height_request(96);

    let icon = gtk::Image::from_icon_name("starred-symbolic");
    icon.set_pixel_size(24);
    card.append(&icon);

    let content = gtk::Box::new(gtk::Orientation::Vertical, 5);
    content.set_hexpand(true);
    let title_row = gtk::Box::new(gtk::Orientation::Horizontal, 6);
    let name = gtk::Label::new(Some(&native::ability_summary_name(ability)));
    name.add_css_class("row-title");
    name.set_xalign(0.0);
    name.set_ellipsize(gtk::pango::EllipsizeMode::End);
    title_row.append(&name);
    if let Some(generation) = ability.generation {
        title_row.append(&metric(&format!("Gen {generation}")));
    }
    content.append(&title_row);
    let effect = ability
        .short_effect_fr
        .as_ref()
        .or(ability.short_effect_en.as_ref())
        .map(String::as_str)
        .unwrap_or("");
    let effect_label = gtk::Label::new(Some(effect));
    effect_label.add_css_class("muted");
    effect_label.set_wrap(true);
    effect_label.set_lines(2);
    effect_label.set_xalign(0.0);
    content.append(&effect_label);
    card.append(&content);

    card
}

fn connect_navigation(
    widgets: &AppWidgets,
    nav_rows: &[(Page, gtk::ListBoxRow)],
    data: LoadedData,
) {
    let nav_rows = Rc::new(nav_rows.to_vec());
    for (page, row) in nav_rows.iter() {
        let page = *page;
        let activate_widgets = widgets.clone();
        let activate_data = data.clone();
        let activate_rows = nav_rows.clone();
        row.connect_activate(move |_| {
            show_page(&activate_widgets, &activate_rows, &activate_data, page);
        });

        let click_widgets = widgets.clone();
        let click_data = data.clone();
        let click_rows = nav_rows.clone();
        let click = gtk::GestureClick::new();
        click.set_button(0);
        click.connect_released(move |_, _, _, _| {
            show_page(&click_widgets, &click_rows, &click_data, page);
        });
        row.add_controller(click);
    }
}

fn show_page(
    widgets: &AppWidgets,
    nav_rows: &[(Page, gtk::ListBoxRow)],
    data: &LoadedData,
    page: Page,
) {
    set_selected_nav_rows(nav_rows, page);

    widgets.current_page.replace(page);
    widgets.stack.set_visible_child_name(page.stack_name());
    widgets.tab_view.set_selected_page(&widgets.home_tab);
    widgets
        .search
        .set_placeholder_text(Some(page.search_placeholder()));
    let had_query = !widgets.search.text().is_empty();
    if had_query {
        widgets.search.set_text("");
    }
    if page == Page::Compare {
        render_compare_page(
            &widgets.compare,
            data.pokemon.clone(),
            widgets.compare_ids.clone(),
            widgets.compare_badge.clone(),
            widgets.sprite_loader.clone(),
        );
    }
    record_navigation(widgets, ViewState::Home(page));
}

fn set_current_page_context(widgets: &AppWidgets, page: Page) {
    set_selected_nav_rows(&widgets.nav_rows, page);
    widgets.current_page.replace(page);
    widgets
        .search
        .set_placeholder_text(Some(page.search_placeholder()));
}

fn set_selected_nav_rows(nav_rows: &[(Page, gtk::ListBoxRow)], page: Page) {
    for (row_page, row) in nav_rows.iter() {
        if *row_page == page {
            row.add_css_class("selected-nav");
        } else {
            row.remove_css_class("selected-nav");
        }
    }
}

fn record_navigation(widgets: &AppWidgets, next: ViewState) {
    if widgets.applying_history.get() {
        return;
    }

    let mut history = widgets.history.borrow_mut();
    if history.current.as_ref() == Some(&next) {
        return;
    }
    if let Some(current) = history.current.replace(next) {
        history.back.push(current);
        if history.back.len() > 120 {
            history.back.remove(0);
        }
    }
    history.forward.clear();
}

fn connect_mouse_history_buttons(
    widget: &impl IsA<gtk::Widget>,
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    data: LoadedData,
) {
    let click = gtk::GestureClick::new();
    click.set_button(0);
    click.set_propagation_phase(gtk::PropagationPhase::Capture);
    let widgets = widgets.clone();
    click.connect_pressed(move |gesture, _, _, _| match gesture.current_button() {
        8 => navigate_history_back(&widgets, &pool, &runtime, &data),
        9 => navigate_history_forward(&widgets, &pool, &runtime, &data),
        _ => {}
    });
    widget.add_controller(click);
}

fn navigate_history_back(
    widgets: &AppWidgets,
    pool: &sqlx::SqlitePool,
    runtime: &tokio::runtime::Runtime,
    data: &LoadedData,
) {
    let Some(previous) = ({
        let mut history = widgets.history.borrow_mut();
        let previous = history.back.pop();
        if let (Some(current), Some(_)) = (history.current.clone(), previous.as_ref()) {
            history.forward.push(current);
        }
        previous
    }) else {
        return;
    };

    apply_history_state(widgets, pool, runtime, data, previous);
}

fn navigate_history_forward(
    widgets: &AppWidgets,
    pool: &sqlx::SqlitePool,
    runtime: &tokio::runtime::Runtime,
    data: &LoadedData,
) {
    let Some(next) = ({
        let mut history = widgets.history.borrow_mut();
        let next = history.forward.pop();
        if let (Some(current), Some(_)) = (history.current.clone(), next.as_ref()) {
            history.back.push(current);
        }
        next
    }) else {
        return;
    };

    apply_history_state(widgets, pool, runtime, data, next);
}

fn apply_history_state(
    widgets: &AppWidgets,
    pool: &sqlx::SqlitePool,
    runtime: &tokio::runtime::Runtime,
    data: &LoadedData,
    state: ViewState,
) {
    widgets.applying_history.set(true);
    match &state {
        ViewState::Home(page) => {
            set_selected_nav_rows(&widgets.nav_rows, *page);
            widgets.current_page.replace(*page);
            widgets.stack.set_visible_child_name(page.stack_name());
            widgets
                .search
                .set_placeholder_text(Some(page.search_placeholder()));
            if *page == Page::Compare {
                render_compare_page(
                    &widgets.compare,
                    data.pokemon.clone(),
                    widgets.compare_ids.clone(),
                    widgets.compare_badge.clone(),
                    widgets.sprite_loader.clone(),
                );
            }
            widgets.tab_view.set_selected_page(&widgets.home_tab);
        }
        ViewState::Target(target) => {
            let existing_page = widgets
                .open_tabs
                .borrow()
                .iter()
                .find(|tab| tab.target == *target)
                .map(|tab| tab.page.clone());
            if let Some(page) = existing_page {
                widgets.tab_view.set_selected_page(&page);
                show_tab_target(widgets, pool, runtime, data, target);
            } else {
                let host = adw::Bin::new();
                let page = widgets.tab_view.append(&host);
                page.set_title(&tab_title(target, data));
                page.set_tooltip(&tab_tooltip(target, data));
                widgets.open_tabs.borrow_mut().push(OpenTab {
                    page: page.clone(),
                    target: target.clone(),
                });
                widgets.tab_view.set_selected_page(&page);
                show_tab_target(widgets, pool, runtime, data, target);
            }
        }
    }
    widgets.history.borrow_mut().current = Some(state);
    widgets.applying_history.set(false);
}

fn connect_search(widgets: &AppWidgets, data: LoadedData) {
    let widgets = widgets.clone();
    let search = widgets.search.clone();
    search.connect_search_changed(move |entry| {
        refresh_visible_page(&widgets, &data, entry.text().as_str());
    });
}

fn connect_filter_controls(widgets: &AppWidgets, data: LoadedData) {
    let control = widgets.pokedex_filters.type_filter.clone();
    let refresh_widgets = widgets.clone();
    let refresh_data = data.clone();
    control.connect_selected_notify(move |_| {
        let has_primary_type =
            selected_type_filter(&refresh_widgets.pokedex_filters.type_filter).is_some();
        refresh_widgets
            .pokedex_filters
            .second_type_filter
            .set_visible(has_primary_type);
        if !has_primary_type {
            refresh_widgets
                .pokedex_filters
                .second_type_filter
                .set_selected(0);
        }
        refresh_pokemon_model(
            &refresh_widgets,
            &refresh_data.pokemon,
            refresh_widgets.search.text().as_str(),
        );
    });

    let control = widgets.pokedex_filters.second_type_filter.clone();
    let refresh_widgets = widgets.clone();
    let refresh_data = data.clone();
    control.connect_selected_notify(move |_| {
        refresh_pokemon_model(
            &refresh_widgets,
            &refresh_data.pokemon,
            refresh_widgets.search.text().as_str(),
        );
    });

    let control = widgets.pokedex_filters.generation_filter.clone();
    let refresh_widgets = widgets.clone();
    let refresh_data = data.clone();
    control.connect_selected_notify(move |_| {
        refresh_pokemon_model(
            &refresh_widgets,
            &refresh_data.pokemon,
            refresh_widgets.search.text().as_str(),
        );
    });

    for control in &widgets.pokedex_filters.sort_filters {
        let control = control.clone();
        let refresh_widgets = widgets.clone();
        let refresh_data = data.clone();
        control.connect_selected_notify(move |_| {
            update_pokedex_sort_filter_visibility(&refresh_widgets.pokedex_filters);
            refresh_pokemon_model(
                &refresh_widgets,
                &refresh_data.pokemon,
                refresh_widgets.search.text().as_str(),
            );
        });
    }

    let control = widgets.pokedex_filters.favorites_filter.clone();
    let refresh_widgets = widgets.clone();
    let refresh_data = data.clone();
    control.connect_active_notify(move |button| {
        button.set_label(if button.is_active() {
            "♥ Favorites"
        } else {
            "♡ Favorites"
        });
        refresh_pokemon_model(
            &refresh_widgets,
            &refresh_data.pokemon,
            refresh_widgets.search.text().as_str(),
        );
    });

    let control = widgets.move_filters.type_filter.clone();
    let refresh_widgets = widgets.clone();
    let refresh_data = data.clone();
    control.connect_selected_notify(move |_| {
        refresh_move_model(
            &refresh_widgets,
            &refresh_data.moves,
            refresh_widgets.search.text().as_str(),
        );
    });

    let control = widgets.move_filters.class_filter.clone();
    let refresh_widgets = widgets.clone();
    let refresh_data = data.clone();
    control.connect_selected_notify(move |_| {
        refresh_move_model(
            &refresh_widgets,
            &refresh_data.moves,
            refresh_widgets.search.text().as_str(),
        );
    });

    let control = widgets.move_filters.min_power_filter.clone();
    let refresh_widgets = widgets.clone();
    let refresh_data = data.clone();
    control.connect_selected_notify(move |_| {
        refresh_move_model(
            &refresh_widgets,
            &refresh_data.moves,
            refresh_widgets.search.text().as_str(),
        );
    });

    let control = widgets.move_filters.max_power_filter.clone();
    let refresh_widgets = widgets.clone();
    let refresh_data = data.clone();
    control.connect_selected_notify(move |_| {
        refresh_move_model(
            &refresh_widgets,
            &refresh_data.moves,
            refresh_widgets.search.text().as_str(),
        );
    });

    let control = widgets.ability_filters.generation_filter.clone();
    let refresh_widgets = widgets.clone();
    let refresh_data = data.clone();
    control.connect_selected_notify(move |_| {
        refresh_ability_flow(
            &refresh_widgets,
            &refresh_data.abilities,
            refresh_widgets.search.text().as_str(),
        );
    });

    let control = widgets.item_filters.category_filter.clone();
    let refresh_widgets = widgets.clone();
    let refresh_data = data.clone();
    control.connect_selected_notify(move |_| {
        refresh_item_model(
            &refresh_widgets,
            &refresh_data.items,
            refresh_widgets.search.text().as_str(),
        );
    });

    let control = widgets.nature_filters.stat_filter.clone();
    let refresh_widgets = widgets.clone();
    let refresh_data = data;
    control.connect_selected_notify(move |_| {
        refresh_nature_model(
            &refresh_widgets,
            &refresh_data.natures,
            refresh_widgets.search.text().as_str(),
        );
    });
}

fn connect_tab_view(
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    data: LoadedData,
) {
    let select_widgets = widgets.clone();
    let select_pool = pool.clone();
    let select_runtime = runtime.clone();
    let select_data = data.clone();
    widgets
        .tab_view
        .connect_selected_page_notify(move |tab_view| {
            let Some(page) = tab_view.selected_page() else {
                return;
            };
            if page == select_widgets.home_tab {
                show_current_browser_page(&select_widgets);
                return;
            }
            let Some(target) = selected_tab_target(&select_widgets, &page) else {
                return;
            };
            show_tab_target(
                &select_widgets,
                &select_pool,
                &select_runtime,
                &select_data,
                &target,
            );
        });

    let close_widgets = widgets.clone();
    let close_pool = pool;
    let close_runtime = runtime;
    let close_data = data;
    widgets.tab_view.connect_close_page(move |tab_view, page| {
        if *page == close_widgets.home_tab {
            return glib::Propagation::Stop;
        }
        close_widgets
            .open_tabs
            .borrow_mut()
            .retain(|tab| tab.page != *page);
        let close_widgets = close_widgets.clone();
        let close_pool = close_pool.clone();
        let close_runtime = close_runtime.clone();
        let close_data = close_data.clone();
        let tab_view = tab_view.clone();
        glib::idle_add_local_once(move || {
            if let Some(page) = tab_view.selected_page() {
                if page == close_widgets.home_tab {
                    show_current_browser_page(&close_widgets);
                } else if let Some(target) = selected_tab_target(&close_widgets, &page) {
                    show_tab_target(
                        &close_widgets,
                        &close_pool,
                        &close_runtime,
                        &close_data,
                        &target,
                    );
                }
            } else {
                tab_view.set_selected_page(&close_widgets.home_tab);
                show_current_browser_page(&close_widgets);
            }
        });
        glib::Propagation::Proceed
    });
}

fn selected_tab_target(widgets: &AppWidgets, page: &adw::TabPage) -> Option<TabTarget> {
    widgets
        .open_tabs
        .borrow()
        .iter()
        .find(|tab| tab.page == *page)
        .map(|tab| tab.target.clone())
}

fn target_tab_page(widgets: &AppWidgets, target: &TabTarget) -> Option<adw::TabPage> {
    widgets
        .open_tabs
        .borrow()
        .iter()
        .find(|tab| tab.target == *target)
        .map(|tab| tab.page.clone())
}

fn append_target_tab(widgets: &AppWidgets, data: &LoadedData, target: &TabTarget) -> adw::TabPage {
    if let Some(page) = target_tab_page(widgets, target) {
        return page;
    }

    let host = adw::Bin::new();
    let page = widgets.tab_view.append(&host);
    page.set_title(&tab_title(target, data));
    page.set_tooltip(&tab_tooltip(target, data));
    widgets.open_tabs.borrow_mut().push(OpenTab {
        page: page.clone(),
        target: target.clone(),
    });
    page
}

fn open_target_in_current_tab(
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    data: LoadedData,
    target: TabTarget,
) {
    open_target_in_new_tab(widgets, pool, runtime, data, target, true);
}

fn open_target_in_new_tab(
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    data: LoadedData,
    target: TabTarget,
    select: bool,
) {
    let previous_page = widgets.tab_view.selected_page();
    let page = append_target_tab(widgets, &data, &target);
    if select {
        widgets.tab_view.set_selected_page(&page);
        show_tab_target(widgets, &pool, &runtime, &data, &target);
    } else if let Some(previous_page) = previous_page {
        widgets.tab_view.set_selected_page(&previous_page);
    } else {
        widgets.tab_view.set_selected_page(&widgets.home_tab);
    }
}

fn show_tab_target(
    widgets: &AppWidgets,
    pool: &sqlx::SqlitePool,
    runtime: &tokio::runtime::Runtime,
    data: &LoadedData,
    target: &TabTarget,
) {
    set_current_page_context(widgets, target_page(target));
    match target {
        TabTarget::Pokemon(id) => load_detail(widgets, pool, runtime, data, *id, true),
        TabTarget::Move(id) => load_move_detail_page(widgets, pool, runtime, *id),
        TabTarget::Ability(id) => load_ability_detail_page(widgets, pool, runtime, *id),
        TabTarget::Item(id) => load_item_detail_page(widgets, pool, runtime, data, *id),
    }
    record_navigation(widgets, ViewState::Target(target.clone()));
}

fn target_page(target: &TabTarget) -> Page {
    match target {
        TabTarget::Pokemon(_) => Page::Pokedex,
        TabTarget::Move(_) => Page::Moves,
        TabTarget::Ability(_) => Page::Abilities,
        TabTarget::Item(_) => Page::Items,
    }
}

fn show_current_browser_page(widgets: &AppWidgets) {
    widgets
        .stack
        .set_visible_child_name(widgets.current_page.borrow().stack_name());
    record_navigation(widgets, ViewState::Home(*widgets.current_page.borrow()));
}

fn tab_title(target: &TabTarget, data: &LoadedData) -> String {
    match target {
        TabTarget::Pokemon(id) => data
            .pokemon
            .iter()
            .find(|pokemon| pokemon.id == *id)
            .map(display_name)
            .unwrap_or_else(|| format!("Pokemon #{id}")),
        TabTarget::Move(id) => data
            .moves
            .iter()
            .find(|move_| move_.id == *id)
            .map(native::move_name)
            .unwrap_or_else(|| format!("Move #{id}")),
        TabTarget::Ability(id) => data
            .abilities
            .iter()
            .find(|ability| ability.id == *id)
            .map(native::ability_summary_name)
            .unwrap_or_else(|| format!("Ability #{id}")),
        TabTarget::Item(id) => data
            .items
            .iter()
            .find(|item| item.id == *id)
            .map(native::item_name)
            .unwrap_or_else(|| format!("Item #{id}")),
    }
}

fn tab_tooltip(target: &TabTarget, data: &LoadedData) -> String {
    let title = tab_title(target, data);
    match target {
        TabTarget::Pokemon(id) => format!("{title} · Pokemon #{id}"),
        TabTarget::Move(id) => format!("{title} · Move #{id}"),
        TabTarget::Ability(id) => format!("{title} · Ability #{id}"),
        TabTarget::Item(id) => format!("{title} · Item #{id}"),
    }
}

fn parse_tab_target(value: &str) -> Option<TabTarget> {
    let (kind, id) = value.split_once(':')?;
    let id = id.parse::<i64>().ok()?;
    match kind {
        "pokemon" => Some(TabTarget::Pokemon(id)),
        "move" => Some(TabTarget::Move(id)),
        "ability" => Some(TabTarget::Ability(id)),
        "item" => Some(TabTarget::Item(id)),
        _ => None,
    }
}

fn target_at_position(widget: &gtk::Widget, x: f64, y: f64) -> Option<TabTarget> {
    let mut current = widget.pick(x, y, gtk::PickFlags::DEFAULT)?;
    loop {
        if let Some(target) = parse_tab_target(current.widget_name().as_str()) {
            return Some(target);
        }
        current = current.parent()?;
    }
}

fn connect_target_mouse_actions(
    widget: &impl IsA<gtk::Widget>,
    left_opens: bool,
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    data: LoadedData,
) {
    let surface = widget.as_ref().clone();
    let click = gtk::GestureClick::new();
    click.set_button(0);
    let click_widgets = widgets.clone();
    click.connect_pressed(move |gesture, _, x, y| {
        let button = gesture.current_button();
        if button != 2 && !(button == 1 && left_opens) {
            return;
        }
        let Some(target) = target_at_position(&surface, x, y) else {
            return;
        };
        if button == 2 {
            open_target_in_new_tab(
                &click_widgets,
                pool.clone(),
                runtime.clone(),
                data.clone(),
                target,
                false,
            );
        } else {
            open_target_in_current_tab(
                &click_widgets,
                pool.clone(),
                runtime.clone(),
                data.clone(),
                target,
            );
        }
    });
    widget.add_controller(click);
}

fn connect_pokemon_activation(
    browser: &gtk::Box,
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    filtered_pokemon: Rc<RefCell<Vec<PokemonSummary>>>,
    data: LoadedData,
) {
    let Some(list) = browser
        .last_child()
        .and_downcast::<gtk::Box>()
        .and_then(|panel| panel.last_child())
        .and_downcast::<gtk::ScrolledWindow>()
        .and_then(|scroller| scroller.child())
        .and_downcast::<gtk::ListView>()
    else {
        return;
    };

    let widgets = widgets.clone();
    let click_widgets = widgets.clone();
    connect_target_mouse_actions(
        &list,
        false,
        &click_widgets,
        pool.clone(),
        runtime.clone(),
        data.clone(),
    );
    list.connect_activate(move |_, position| {
        let Some(pokemon) = filtered_pokemon.borrow().get(position as usize).cloned() else {
            return;
        };
        open_target_in_current_tab(
            &widgets,
            pool.clone(),
            runtime.clone(),
            data.clone(),
            TabTarget::Pokemon(pokemon.id),
        );
    });
}

fn connect_move_activation(
    page: &gtk::Box,
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    filtered_moves: Rc<RefCell<Vec<MoveSummary>>>,
    data: LoadedData,
) {
    let Some(list) = list_view_from_browser_page(page) else {
        return;
    };

    let widgets = widgets.clone();
    let click_widgets = widgets.clone();
    connect_target_mouse_actions(
        &list,
        false,
        &click_widgets,
        pool.clone(),
        runtime.clone(),
        data.clone(),
    );
    list.connect_activate(move |_, position| {
        let Some(move_) = filtered_moves.borrow().get(position as usize).cloned() else {
            return;
        };
        open_target_in_current_tab(
            &widgets,
            pool.clone(),
            runtime.clone(),
            data.clone(),
            TabTarget::Move(move_.id),
        );
    });
}

fn connect_item_activation(
    page: &gtk::Box,
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    filtered_items: Rc<RefCell<Vec<ItemSummary>>>,
    data: LoadedData,
) {
    let Some(list) = list_view_from_browser_page(page) else {
        return;
    };

    let widgets = widgets.clone();
    let click_widgets = widgets.clone();
    connect_target_mouse_actions(
        &list,
        false,
        &click_widgets,
        pool.clone(),
        runtime.clone(),
        data.clone(),
    );
    list.connect_activate(move |_, position| {
        let Some(item) = filtered_items.borrow().get(position as usize).cloned() else {
            return;
        };
        open_target_in_current_tab(
            &widgets,
            pool.clone(),
            runtime.clone(),
            data.clone(),
            TabTarget::Item(item.id),
        );
    });
}

fn connect_ability_activation(
    widgets: &AppWidgets,
    pool: Rc<sqlx::SqlitePool>,
    runtime: Rc<tokio::runtime::Runtime>,
    filtered_abilities: Rc<RefCell<Vec<AbilitySummary>>>,
    data: LoadedData,
) {
    let widgets = widgets.clone();
    let ability_flow = widgets.ability_flow.clone();
    connect_target_mouse_actions(
        &ability_flow,
        false,
        &widgets,
        pool.clone(),
        runtime.clone(),
        data.clone(),
    );
    ability_flow.connect_child_activated(move |_, child| {
        let position = child.index();
        let Some(ability) = filtered_abilities
            .borrow()
            .get(position.max(0) as usize)
            .cloned()
        else {
            return;
        };
        open_target_in_current_tab(
            &widgets,
            pool.clone(),
            runtime.clone(),
            data.clone(),
            TabTarget::Ability(ability.id),
        );
    });
}

fn list_view_from_browser_page(page: &gtk::Box) -> Option<gtk::ListView> {
    page.last_child()
        .and_downcast::<gtk::Box>()
        .and_then(|panel| panel.last_child())
        .and_downcast::<gtk::ScrolledWindow>()
        .and_then(|scroller| scroller.child())
        .and_downcast::<gtk::ListView>()
}

fn scroll_to_top(scroller: &gtk::ScrolledWindow) {
    let adjustment = scroller.vadjustment();
    adjustment.set_value(adjustment.lower());
    let adjustment = adjustment.clone();
    glib::idle_add_local_once(move || {
        adjustment.set_value(adjustment.lower());
    });
    let adjustment = scroller.vadjustment();
    glib::timeout_add_local_once(Duration::from_millis(80), move || {
        adjustment.set_value(adjustment.lower());
    });
}

fn scroll_to_widget(scroller: &gtk::ScrolledWindow, widget: &impl IsA<gtk::Widget>) {
    let scroller = scroller.clone();
    let widget = widget.as_ref().clone();
    let scroll = move |scroller: &gtk::ScrolledWindow, widget: &gtk::Widget| {
        let Some(bounds) = widget.compute_bounds(scroller) else {
            return;
        };
        let adjustment = scroller.vadjustment();
        let upper = adjustment.upper() - adjustment.page_size();
        let target = adjustment.value() + bounds.y() as f64 - 18.0;
        adjustment.set_value(target.clamp(adjustment.lower(), upper.max(adjustment.lower())));
    };

    let scroller_for_idle = scroller.clone();
    let widget_for_idle = widget.clone();
    glib::idle_add_local_once(move || {
        scroll(&scroller_for_idle, &widget_for_idle);
    });

    for delay in [120, 260, 480] {
        let scroller = scroller.clone();
        let widget = widget.clone();
        glib::timeout_add_local_once(Duration::from_millis(delay), move || {
            let Some(bounds) = widget.compute_bounds(&scroller) else {
                return;
            };
            let adjustment = scroller.vadjustment();
            let upper = adjustment.upper() - adjustment.page_size();
            let target = adjustment.value() + bounds.y() as f64 - 18.0;
            adjustment.set_value(target.clamp(adjustment.lower(), upper.max(adjustment.lower())));
        });
    }
}

fn load_move_detail_page(
    widgets: &AppWidgets,
    pool: &sqlx::SqlitePool,
    runtime: &tokio::runtime::Runtime,
    move_id: i64,
) {
    let result = runtime.block_on(async {
        let detail = native::load_move_detail(pool, move_id).await?;
        let pokemon = native::load_move_pokemon(pool, move_id).await?;
        Ok::<_, sqlx::Error>((detail, pokemon))
    });

    if let Ok((Some(move_), pokemon)) = result {
        update_move_detail(
            &widgets.move_detail,
            &move_,
            &pokemon,
            &widgets.sprite_loader,
        );
        widgets.stack.set_visible_child_name("move-detail");
        scroll_to_top(&widgets.move_detail.scroller);
    }
}

fn load_ability_detail_page(
    widgets: &AppWidgets,
    pool: &sqlx::SqlitePool,
    runtime: &tokio::runtime::Runtime,
    ability_id: i64,
) {
    let result = runtime.block_on(async {
        let detail = native::load_ability_detail(pool, ability_id).await?;
        let pokemon = native::load_ability_pokemon(pool, ability_id).await?;
        Ok::<_, sqlx::Error>((detail, pokemon))
    });

    if let Ok((Some(ability), pokemon)) = result {
        update_ability_detail(
            &widgets.ability_detail,
            &ability,
            &pokemon,
            &widgets.sprite_loader,
        );
        widgets.stack.set_visible_child_name("ability-detail");
        scroll_to_top(&widgets.ability_detail.scroller);
    }
}

fn load_item_detail_page(
    widgets: &AppWidgets,
    pool: &sqlx::SqlitePool,
    runtime: &tokio::runtime::Runtime,
    data: &LoadedData,
    item_id: i64,
) {
    let selected_game = data.selected_game.clone();
    let result = runtime.block_on(async {
        let detail = native::load_item_detail(pool, item_id).await?;
        let locations = if let (Some(game), Some(item)) = (selected_game.as_ref(), detail.as_ref())
        {
            native::load_game_item_locations(pool, &game.id, &item.name_key).await?
        } else {
            Vec::new()
        };
        Ok::<_, sqlx::Error>((detail, locations))
    });

    if let Ok((Some(item), locations)) = result {
        update_item_detail(
            &widgets.item_detail,
            &item,
            &locations,
            selected_game.as_ref(),
            &widgets.sprite_loader,
        );
        widgets.stack.set_visible_child_name("item-detail");
        scroll_to_top(&widgets.item_detail.scroller);
    }
}

fn update_move_detail(
    widgets: &EntityDetailWidgets,
    move_: &MoveDetail,
    pokemon: &[MovePokemonEntry],
    sprite_loader: &SpriteLoader,
) {
    widgets
        .icon
        .set_icon_name(Some("media-playlist-shuffle-symbolic"));
    widgets.id.set_text(&format!("#{}", move_.id));
    widgets.title.set_text(&move_detail_name(move_));
    clear_box(&widgets.types);
    append_type_pill(&widgets.types, move_.type_key.as_deref());
    clear_box(&widgets.metrics);
    widgets.metrics.append(&metric(
        &move_
            .damage_class
            .as_deref()
            .map(native::titleize_key)
            .unwrap_or_else(|| "Class —".to_owned()),
    ));
    widgets.metrics.append(&metric(&format!(
        "Power {}",
        move_
            .power
            .map(|value| value.to_string())
            .unwrap_or_else(|| "—".to_owned())
    )));
    widgets.metrics.append(&metric(&format!(
        "Accuracy {}",
        move_
            .accuracy
            .map(|value| format!("{value}%"))
            .unwrap_or_else(|| "—".to_owned())
    )));
    widgets.metrics.append(&metric(&format!(
        "PP {}",
        move_
            .pp
            .map(|value| value.to_string())
            .unwrap_or_else(|| "—".to_owned())
    )));
    if let Some(priority) = move_.priority {
        widgets
            .metrics
            .append(&metric(&format!("Priority {priority}")));
    }
    widgets.description.set_text(
        move_
            .effect_fr
            .as_deref()
            .or(move_.effect_en.as_deref())
            .unwrap_or(""),
    );
    widgets
        .related_title
        .set_text("Pokemon that learn this move");
    clear_box(&widgets.related);
    if pokemon.is_empty() {
        widgets
            .related
            .append(&info_row("dialog-information-symbolic", "No Pokemon data."));
    } else {
        for entry in pokemon.iter().take(80) {
            widgets
                .related
                .append(&move_pokemon_row(entry, sprite_loader));
        }
    }
}

fn update_ability_detail(
    widgets: &EntityDetailWidgets,
    ability: &AbilityDetail,
    pokemon: &[AbilityPokemonEntry],
    sprite_loader: &SpriteLoader,
) {
    widgets.icon.set_icon_name(Some("starred-symbolic"));
    widgets.icon.set_pixel_size(56);
    widgets.id.set_text(&format!("#{}", ability.id));
    widgets.title.set_text(&ability_detail_name(ability));
    clear_box(&widgets.types);
    clear_box(&widgets.metrics);
    if let Some(generation) = ability.generation {
        widgets
            .metrics
            .append(&metric(&format!("Generation {generation}")));
    }
    widgets.description.set_text(
        ability
            .effect_fr
            .as_deref()
            .or(ability.effect_en.as_deref())
            .or(ability.short_effect_fr.as_deref())
            .or(ability.short_effect_en.as_deref())
            .unwrap_or(""),
    );
    widgets.related_title.set_text("Pokemon with this ability");
    clear_box(&widgets.related);
    if pokemon.is_empty() {
        widgets
            .related
            .append(&info_row("dialog-information-symbolic", "No Pokemon data."));
    } else {
        for entry in pokemon.iter().take(80) {
            widgets
                .related
                .append(&ability_pokemon_row(entry, sprite_loader));
        }
    }
}

fn update_item_detail(
    widgets: &EntityDetailWidgets,
    item: &ItemDetail,
    locations: &[String],
    selected_game: Option<&GameSummary>,
    sprite_loader: &SpriteLoader,
) {
    load_sprite(sprite_loader, &widgets.icon, item.sprite_url.as_deref(), 64);
    widgets.id.set_text(&format!("#{}", item.id));
    widgets.title.set_text(&item_detail_name(item));
    clear_box(&widgets.types);
    clear_box(&widgets.metrics);
    if let Some(category) = item.category.as_ref() {
        widgets.metrics.append(&metric(category));
    }
    widgets.description.set_text(
        item.effect_fr
            .as_deref()
            .or(item.effect_en.as_deref())
            .unwrap_or(""),
    );
    widgets.related_title.set_text("Locations");
    clear_box(&widgets.related);
    if let Some(game) = selected_game {
        widgets.related.append(&info_row(
            "input-gaming-symbolic",
            &format!("Data for {}", game.name_en),
        ));
    }
    if locations.is_empty() {
        widgets.related.append(&info_row(
            "mark-location-symbolic",
            "No location data for this item.",
        ));
    } else {
        for location in locations {
            widgets
                .related
                .append(&info_row("mark-location-symbolic", location));
        }
    }
}

fn move_pokemon_row(entry: &MovePokemonEntry, sprite_loader: &SpriteLoader) -> gtk::Box {
    let row = related_pokemon_row(
        entry.pokemon_id,
        &entry.name_key,
        entry.name_en.as_deref(),
        entry.name_fr.as_deref(),
        entry.type1_key.as_deref(),
        entry.type2_key.as_deref(),
        entry.sprite_url.as_deref(),
        sprite_loader,
    );
    row.append(&metric(&learn_method_label(&entry.learn_method)));
    if entry.learn_method == "level-up" {
        row.append(&metric(&format!("Lv. {}", entry.level_learned_at)));
    }
    row
}

fn ability_pokemon_row(entry: &AbilityPokemonEntry, sprite_loader: &SpriteLoader) -> gtk::Box {
    let row = related_pokemon_row(
        entry.pokemon_id,
        &entry.name_key,
        entry.name_en.as_deref(),
        entry.name_fr.as_deref(),
        entry.type1_key.as_deref(),
        entry.type2_key.as_deref(),
        entry.sprite_url.as_deref(),
        sprite_loader,
    );
    let status = gtk::Box::new(gtk::Orientation::Horizontal, 0);
    status.set_width_request(88);
    status.set_halign(gtk::Align::End);
    if entry.is_hidden == 1 {
        status.append(&metric("Hidden"));
    }
    row.append(&status);
    row
}

fn related_pokemon_row(
    pokemon_id: i64,
    name_key: &str,
    name_en: Option<&str>,
    name_fr: Option<&str>,
    type1: Option<&str>,
    type2: Option<&str>,
    sprite_url: Option<&str>,
    sprite_loader: &SpriteLoader,
) -> gtk::Box {
    let row = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    row.add_css_class("data-row");
    row.set_widget_name(&format!("pokemon:{pokemon_id}"));
    row.set_halign(gtk::Align::Fill);
    row.set_hexpand(true);
    let sprite = gtk::Image::from_icon_name("image-x-generic-symbolic");
    load_sprite(sprite_loader, &sprite, sprite_url, 34);
    row.append(&sprite_frame(&sprite, 40, "sprite-frame"));
    row.append(&sized_label(
        &format!("#{pokemon_id:03}"),
        54,
        false,
        "dex-id",
    ));
    row.append(&sized_label(
        &name_fr
            .or(name_en)
            .map(ToOwned::to_owned)
            .unwrap_or_else(|| native::titleize_key(name_key)),
        150,
        true,
        "row-title",
    ));
    let types = gtk::Box::new(gtk::Orientation::Horizontal, 6);
    types.set_width_request(150);
    types.set_halign(gtk::Align::End);
    append_type_pill(&types, type1);
    append_type_pill(&types, type2);
    row.append(&types);
    row
}

fn build_detail_page() -> (gtk::ScrolledWindow, DetailWidgets) {
    let scroller = gtk::ScrolledWindow::builder()
        .hscrollbar_policy(gtk::PolicyType::Never)
        .vexpand(true)
        .build();
    let clamp = adw::Clamp::builder().maximum_size(900).build();
    let wrap = gtk::Box::new(gtk::Orientation::Vertical, 24);
    wrap.add_css_class("detail-wrap");
    wrap.set_margin_top(28);
    wrap.set_margin_bottom(42);
    wrap.set_margin_start(18);
    wrap.set_margin_end(18);

    let hero = gtk::Box::new(gtk::Orientation::Horizontal, 28);
    hero.set_halign(gtk::Align::Fill);
    hero.set_hexpand(true);
    hero.set_valign(gtk::Align::Center);

    let sprite = gtk::Image::from_icon_name("image-x-generic-symbolic");
    sprite.set_pixel_size(136);
    let sprite_card = sprite_frame(&sprite, 150, "detail-sprite-frame");
    hero.append(&sprite_card);

    let info = gtk::Box::new(gtk::Orientation::Vertical, 10);
    info.set_hexpand(true);
    let id = gtk::Label::new(None);
    id.add_css_class("detail-id");
    id.set_xalign(0.0);
    let title = gtk::Label::new(None);
    title.add_css_class("detail-title");
    title.set_xalign(0.0);
    title.set_wrap(true);
    let types = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    let description = gtk::Label::new(None);
    description.add_css_class("muted");
    description.set_wrap(true);
    description.set_xalign(0.0);
    let metrics = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    info.append(&id);
    info.append(&title);
    info.append(&types);
    info.append(&description);
    info.append(&metrics);
    hero.append(&info);
    wrap.append(&hero);

    let game_banner = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    game_banner.add_css_class("game-banner");
    let game_icon = gtk::Image::from_icon_name("input-gaming-symbolic");
    let game_label = gtk::Label::new(None);
    game_label.add_css_class("muted");
    game_label.set_xalign(0.0);
    game_label.set_hexpand(true);
    game_banner.append(&game_icon);
    game_banner.append(&game_label);
    wrap.append(&game_banner);

    let locations_section = detail_section("Locations");
    let locations = gtk::Box::new(gtk::Orientation::Vertical, 7);
    locations.add_css_class("section-card");
    locations.add_css_class("detail-content-card");
    locations_section.append(&locations);
    wrap.append(&locations_section);

    let abilities_section = detail_section("Abilities");
    let abilities = gtk::Box::new(gtk::Orientation::Vertical, 8);
    abilities.add_css_class("section-card");
    abilities.add_css_class("detail-content-card");
    abilities_section.append(&abilities);
    wrap.append(&abilities_section);

    let stats_section = detail_section("Base Stats");
    let stats_card = gtk::Box::new(gtk::Orientation::Vertical, 10);
    stats_card.add_css_class("section-card");
    stats_card.add_css_class("detail-content-card");
    let mut stats = Vec::new();
    for (name, class_name, color) in [
        ("HP", "stat-hp", "#ff4d55"),
        ("Atk", "stat-atk", "#ff8a22"),
        ("Def", "stat-def", "#ffd21a"),
        ("SpA", "stat-spa", "#7772ff"),
        ("SpD", "stat-spd", "#20d179"),
        ("Spe", "stat-spe", "#f14aa0"),
    ] {
        let row = gtk::Box::new(gtk::Orientation::Horizontal, 12);
        row.add_css_class("stat-row");
        let stat_name = sized_label(name, 46, false, class_name);
        stat_name.set_valign(gtk::Align::Center);
        let value = sized_label("", 42, false, "stat-value");
        value.set_valign(gtk::Align::Center);
        let bar = StatMeter::new(color);
        row.append(&stat_name);
        row.append(&value);
        row.append(bar.widget());
        stats_card.append(&row);
        stats.push((value, Some(bar)));
    }
    let total_row = gtk::Box::new(gtk::Orientation::Horizontal, 12);
    total_row.add_css_class("stat-row");
    let total_name = sized_label("TOT", 46, false, "stat-total-name");
    total_name.set_valign(gtk::Align::Center);
    total_row.append(&total_name);
    let total_value = sized_label("", 42, false, "stat-total-value");
    total_value.set_valign(gtk::Align::Center);
    total_row.append(&total_value);
    stats_card.append(&total_row);
    stats.push((total_value, None));
    stats_section.append(&stats_card);
    wrap.append(&stats_section);

    let matchups_section = detail_section("Type Matchups");
    let matchups = gtk::Box::new(gtk::Orientation::Vertical, 8);
    matchups.add_css_class("section-card");
    matchups.add_css_class("detail-content-card");
    matchups_section.append(&matchups);
    wrap.append(&matchups_section);

    let evolution_section = detail_section("Evolution");
    let evolution = gtk::Box::new(gtk::Orientation::Horizontal, 10);
    evolution.add_css_class("section-card");
    evolution.add_css_class("detail-content-card");
    evolution.set_valign(gtk::Align::Center);
    let evolution_scroller = gtk::ScrolledWindow::builder()
        .hscrollbar_policy(gtk::PolicyType::Automatic)
        .vscrollbar_policy(gtk::PolicyType::Never)
        .min_content_height(150)
        .child(&evolution)
        .build();
    evolution_section.append(&evolution_scroller);
    wrap.append(&evolution_section);

    let moves_section = detail_section("Moves");
    let moves = gtk::Box::new(gtk::Orientation::Vertical, 12);
    moves.add_css_class("section-card");
    moves.add_css_class("detail-content-card");
    moves_section.append(&moves);
    wrap.append(&moves_section);

    clamp.set_child(Some(&wrap));
    scroller.set_child(Some(&clamp));
    let detail_scroller = scroller.clone();

    (
        scroller,
        DetailWidgets {
            scroller: detail_scroller,
            sprite,
            title,
            id,
            types,
            description,
            metrics,
            stats,
            abilities,
            game_banner,
            game_label,
            locations_section,
            locations,
            stats_section,
            matchups_section,
            matchups,
            evolution_section,
            evolution,
            moves_section,
            moves,
        },
    )
}

fn build_entity_detail_page(
    kind: &str,
    icon_name: &str,
) -> (gtk::ScrolledWindow, EntityDetailWidgets) {
    let scroller = gtk::ScrolledWindow::builder()
        .hscrollbar_policy(gtk::PolicyType::Never)
        .vexpand(true)
        .build();
    let clamp = adw::Clamp::builder().maximum_size(900).build();
    let wrap = gtk::Box::new(gtk::Orientation::Vertical, 22);
    wrap.add_css_class("detail-wrap");
    wrap.set_margin_top(28);
    wrap.set_margin_bottom(42);
    wrap.set_margin_start(18);
    wrap.set_margin_end(18);

    let hero = gtk::Box::new(gtk::Orientation::Horizontal, 22);
    hero.set_halign(gtk::Align::Fill);
    hero.set_hexpand(true);
    hero.set_valign(gtk::Align::Start);
    let icon = gtk::Image::from_icon_name(icon_name);
    icon.set_pixel_size(58);
    let icon_frame = sprite_frame(&icon, 112, "entity-icon-frame");
    icon_frame.set_valign(gtk::Align::Start);
    hero.append(&icon_frame);

    let info = gtk::Box::new(gtk::Orientation::Vertical, 10);
    info.set_hexpand(true);
    let id = gtk::Label::new(Some(kind));
    id.add_css_class("detail-id");
    id.set_xalign(0.0);
    let title = gtk::Label::new(None);
    title.add_css_class("detail-title");
    title.set_xalign(0.0);
    title.set_wrap(true);
    let types = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    let metrics = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    let description = gtk::Label::new(None);
    description.add_css_class("muted");
    description.set_wrap(true);
    description.set_xalign(0.0);
    info.append(&id);
    info.append(&title);
    info.append(&types);
    info.append(&metrics);
    info.append(&description);
    hero.append(&info);
    wrap.append(&hero);

    let related_section = detail_section("Related Pokemon");
    let related_title = related_section
        .first_child()
        .and_downcast::<gtk::Label>()
        .unwrap_or_else(|| gtk::Label::new(Some("Related Pokemon")));
    let related = gtk::Box::new(gtk::Orientation::Vertical, 0);
    related.add_css_class("section-card");
    related.add_css_class("detail-content-card");
    related_section.append(&related);
    wrap.append(&related_section);

    clamp.set_child(Some(&wrap));
    scroller.set_child(Some(&clamp));
    let detail_scroller = scroller.clone();

    (
        scroller,
        EntityDetailWidgets {
            scroller: detail_scroller,
            icon,
            title,
            id,
            types,
            metrics,
            description,
            related_title,
            related,
        },
    )
}

fn detail_section(title: &str) -> gtk::Box {
    let section = gtk::Box::new(gtk::Orientation::Vertical, 10);
    let label = gtk::Label::new(Some(title));
    label.add_css_class("section-title");
    label.add_css_class("section-title-underline");
    label.set_xalign(0.0);
    label.set_halign(gtk::Align::Start);
    section.append(&label);
    section
}

fn load_detail(
    widgets: &AppWidgets,
    pool: &sqlx::SqlitePool,
    runtime: &tokio::runtime::Runtime,
    data: &LoadedData,
    pokemon_id: i64,
    show: bool,
) {
    let selected_game = data.selected_game.clone();
    let result = runtime.block_on(async {
        let detail = native::load_pokemon_detail(pool, pokemon_id).await?;
        let base_abilities = native::load_pokemon_abilities(pool, pokemon_id).await?;
        let base_moves = native::load_pokemon_moves(pool, pokemon_id).await?;
        let evolution = native::load_pokemon_evolution_chain(pool, pokemon_id).await?;
        let alternate_forms = if let Some(chain_id) = detail
            .as_ref()
            .and_then(|pokemon| pokemon.evolution_chain_id)
        {
            native::load_alternate_forms(pool, chain_id).await?
        } else {
            Vec::new()
        };

        let (game_abilities, game_moves, game_locations) = if let Some(game) = &selected_game {
            let Some(detail) = detail.as_ref() else {
                return Ok::<_, sqlx::Error>((
                    None,
                    Vec::new(),
                    Vec::new(),
                    None,
                    Vec::new(),
                    Vec::new(),
                ));
            };
            (
                native::load_game_pokemon_abilities(pool, &game.id, &detail.name_key).await?,
                native::load_game_pokemon_moves(pool, &game.id, &detail.name_key).await?,
                native::load_game_pokemon_locations(pool, &game.id, &detail.name_key).await?,
            )
        } else {
            (Vec::new(), Vec::new(), Vec::new())
        };

        let abilities = if game_abilities.is_empty() {
            base_abilities
        } else {
            game_abilities
        };
        let moves = merge_game_moves(base_moves, game_moves);

        Ok::<_, sqlx::Error>((
            detail,
            abilities,
            moves,
            evolution,
            alternate_forms,
            game_locations,
        ))
    });

    if let Ok((Some(pokemon), abilities, moves, evolution, alternate_forms, locations)) = result {
        update_detail(
            &widgets.detail,
            &pokemon,
            &abilities,
            &moves,
            evolution.as_ref(),
            &alternate_forms,
            &locations,
            selected_game.as_ref(),
            &widgets.sprite_loader,
        );
        if show {
            widgets.stack.set_visible_child_name("detail");
            match std::env::var("POKEDIA_START_SECTION").ok().as_deref() {
                Some("evolution") => {
                    scroll_to_widget(&widgets.detail.scroller, &widgets.detail.evolution_section);
                }
                Some("stats") => {
                    scroll_to_widget(&widgets.detail.scroller, &widgets.detail.stats_section);
                }
                Some("moves") => {
                    scroll_to_widget(&widgets.detail.scroller, &widgets.detail.moves_section);
                }
                _ => scroll_to_top(&widgets.detail.scroller),
            }
        }
    }
}

fn merge_game_moves(
    base_moves: Vec<PokemonMoveEntry>,
    game_moves: Vec<PokemonMoveEntry>,
) -> Vec<PokemonMoveEntry> {
    if game_moves.is_empty() {
        return base_moves;
    }

    let game_methods = game_moves
        .iter()
        .map(|entry| entry.learn_method.clone())
        .collect::<HashSet<_>>();
    let mut merged = game_moves;
    let mut seen = merged.iter().map(move_identity).collect::<HashSet<_>>();

    for entry in base_moves {
        if game_methods.contains(&entry.learn_method) {
            continue;
        }
        if seen.insert(move_identity(&entry)) {
            merged.push(entry);
        }
    }

    merged.sort_by(|left, right| {
        learn_method_rank(&left.learn_method)
            .cmp(&learn_method_rank(&right.learn_method))
            .then_with(|| left.level_learned_at.cmp(&right.level_learned_at))
            .then_with(|| move_name_from_entry(left).cmp(&move_name_from_entry(right)))
    });
    merged
}

fn move_identity(entry: &PokemonMoveEntry) -> (String, String) {
    (
        entry.learn_method.clone(),
        entry
            .name_key
            .clone()
            .unwrap_or_else(|| entry.move_id.to_string()),
    )
}

fn learn_method_rank(method: &str) -> usize {
    match method {
        "level-up" => 0,
        "machine" => 1,
        "tutor" => 2,
        "egg" => 3,
        _ => 4,
    }
}

fn update_detail(
    detail: &DetailWidgets,
    pokemon: &PokemonDetail,
    abilities: &[PokemonAbility],
    moves: &[PokemonMoveEntry],
    evolution: Option<&EvolutionNode>,
    alternate_forms: &[PokemonSummary],
    locations: &[String],
    selected_game: Option<&GameSummary>,
    sprite_loader: &SpriteLoader,
) {
    let base_id = pokemon.species_id.unwrap_or(pokemon.id);
    detail.id.set_text(&format!("#{base_id:03}"));
    detail.title.set_text(&detail_display_name(pokemon));
    let sprite_url = pokemon_sprite_url(pokemon.id, pokemon.sprite_url.as_deref());
    load_sprite(sprite_loader, &detail.sprite, Some(&sprite_url), 136);

    clear_box(&detail.types);
    append_type_pill(&detail.types, pokemon.type1_key.as_deref());
    append_type_pill(&detail.types, pokemon.type2_key.as_deref());

    detail.description.set_text(
        pokemon
            .description_fr
            .as_deref()
            .or(pokemon.description_en.as_deref())
            .unwrap_or(""),
    );

    clear_box(&detail.metrics);
    detail.metrics.append(&metric(&format!(
        "Height {:.1} m",
        pokemon.height.unwrap_or_default() as f64 / 10.0
    )));
    detail.metrics.append(&metric(&format!(
        "Weight {:.1} kg",
        pokemon.weight.unwrap_or_default() as f64 / 10.0
    )));
    detail.metrics.append(&metric(&format!(
        "BST {}",
        pokemon.base_stat_total.unwrap_or_default()
    )));

    let values = [
        pokemon.hp,
        pokemon.atk,
        pokemon.def,
        pokemon.spa,
        pokemon.spd,
        pokemon.spe,
    ];
    for ((label, bar), value) in detail.stats.iter().zip(values) {
        let value = value.unwrap_or(0);
        label.set_text(&value.to_string());
        if let Some(bar) = bar {
            bar.set_fraction((value as f64 / 255.0).clamp(0.0, 1.0));
        }
    }
    if let Some((total_label, _)) = detail.stats.get(6) {
        total_label.set_text(
            &pokemon
                .base_stat_total
                .map(|value| value.to_string())
                .unwrap_or_else(|| "-".to_owned()),
        );
    }

    clear_box(&detail.abilities);
    if abilities.is_empty() {
        let empty = gtk::Label::new(Some("No ability data"));
        empty.add_css_class("muted");
        empty.set_xalign(0.0);
        detail.abilities.append(&empty);
    } else {
        for ability in abilities {
            let row = gtk::Box::new(gtk::Orientation::Vertical, 4);
            row.set_margin_top(4);
            row.set_margin_bottom(4);
            if let Some(ability_id) = ability.ability_id {
                row.set_widget_name(&format!("ability:{ability_id}"));
            }
            let name = gtk::Label::new(Some(&native::ability_name(ability)));
            name.add_css_class("row-title");
            name.set_xalign(0.0);
            row.append(&name);
            if let Some(effect) = ability
                .short_effect_fr
                .as_ref()
                .or(ability.short_effect_en.as_ref())
            {
                let effect = gtk::Label::new(Some(effect));
                effect.add_css_class("muted");
                effect.set_wrap(true);
                effect.set_xalign(0.0);
                row.append(&effect);
            }
            detail.abilities.append(&row);
        }
    }

    if let Some(game) = selected_game {
        detail.game_banner.set_visible(true);
        detail.game_label.set_text(&format!(
            "Data for {}{}",
            game.name_en,
            game.version
                .as_ref()
                .map(|version| format!(" v{version}"))
                .unwrap_or_default()
        ));
    } else {
        detail.game_banner.set_visible(false);
    }

    update_locations(detail, locations, selected_game.is_some());
    update_matchups(detail, pokemon, abilities);
    update_evolution(
        detail,
        evolution,
        alternate_forms,
        pokemon.id,
        sprite_loader,
    );
    update_pokemon_moves(detail, moves);
}

fn update_locations(detail: &DetailWidgets, locations: &[String], has_game: bool) {
    detail.locations_section.set_visible(has_game);
    clear_box(&detail.locations);
    if !has_game {
        return;
    }

    if locations.is_empty() {
        let row = info_row(
            "mark-location-symbolic",
            "Not catchable — obtainable via evolution, trade, gift, or special event",
        );
        detail.locations.append(&row);
        return;
    }

    for location in locations {
        detail
            .locations
            .append(&info_row("mark-location-symbolic", location));
    }
}

fn update_matchups(detail: &DetailWidgets, pokemon: &PokemonDetail, abilities: &[PokemonAbility]) {
    clear_box(&detail.matchups);

    let Some(type1) = pokemon.type1_key.as_deref() else {
        detail.matchups_section.set_visible(false);
        return;
    };

    detail.matchups_section.set_visible(true);
    let ability_key = matchup_ability(abilities);
    let buckets = defensive_buckets(type1, pokemon.type2_key.as_deref(), ability_key);
    let mut shown = false;

    for (factor, types) in buckets.into_iter().rev() {
        if factor == 100 || types.is_empty() {
            continue;
        }
        shown = true;
        let row = gtk::Box::new(gtk::Orientation::Horizontal, 10);
        row.add_css_class("matchup-row");
        if factor > 100 {
            row.add_css_class("matchup-bad");
        } else if factor < 100 {
            row.add_css_class("matchup-good");
        } else {
            row.add_css_class("matchup-neutral");
        }
        let factor_label = sized_label(&factor_label(factor), 52, false, "row-title");
        factor_label.set_xalign(1.0);
        row.append(&factor_label);
        let flow = gtk::FlowBox::builder()
            .selection_mode(gtk::SelectionMode::None)
            .column_spacing(6)
            .row_spacing(6)
            .min_children_per_line(1)
            .max_children_per_line(12)
            .build();
        for type_key in types {
            flow.append(&type_pill(type_key));
        }
        row.append(&flow);
        detail.matchups.append(&row);
    }

    if let Some(ability_key) = ability_key {
        if ability_has_matchup_effect(ability_key) {
            detail.matchups.append(&info_row(
                "security-medium-symbolic",
                &format!(
                    "Adjusted with {}",
                    abilities
                        .iter()
                        .find(|ability| ability.ability_key == ability_key)
                        .map(native::ability_name)
                        .unwrap_or_else(|| native::titleize_key(ability_key))
                ),
            ));
        }
    }

    if !shown {
        detail.matchups.append(&info_row(
            "dialog-information-symbolic",
            "No special matchup.",
        ));
    }
}

fn update_evolution(
    detail: &DetailWidgets,
    evolution: Option<&EvolutionNode>,
    alternate_forms: &[PokemonSummary],
    current_id: i64,
    sprite_loader: &SpriteLoader,
) {
    clear_box(&detail.evolution);
    let Some(evolution) = evolution else {
        detail.evolution_section.set_visible(false);
        return;
    };

    detail.evolution_section.set_visible(true);
    let mut node_ids = HashMap::new();
    collect_evolution_node_ids(evolution, &mut node_ids);
    let tree = evolution_branch(
        evolution,
        alternate_forms,
        &node_ids,
        current_id,
        sprite_loader,
    );
    detail.evolution.append(&tree);
}

fn collect_evolution_node_ids(node: &EvolutionNode, ids: &mut HashMap<String, i64>) {
    if let Some(id) = node.pokemon_id {
        ids.insert(node.name_key.clone(), id);
    }
    for child in &node.evolves_to {
        collect_evolution_node_ids(child, ids);
    }
}

fn evolution_branch(
    node: &EvolutionNode,
    alternate_forms: &[PokemonSummary],
    node_ids: &HashMap<String, i64>,
    current_id: i64,
    sprite_loader: &SpriteLoader,
) -> gtk::Box {
    let branch = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    branch.add_css_class("evo-stage");
    branch.set_valign(gtk::Align::Center);
    branch.append(&evolution_card(node, current_id, sprite_loader));

    let forms = forms_for_node(node, alternate_forms, node_ids);
    if node.evolves_to.is_empty() && forms.is_empty() {
        return branch;
    }

    if node.evolves_to.len() == 1 && forms.is_empty() {
        let child = &node.evolves_to[0];
        branch.append(&evolution_arrow(
            format_trigger(child.trigger.as_deref(), child.trigger_detail.as_deref()),
            false,
        ));
        branch.append(&evolution_branch(
            child,
            alternate_forms,
            node_ids,
            current_id,
            sprite_loader,
        ));
        return branch;
    }

    let branches = gtk::Grid::new();
    branches.add_css_class("evo-branches");
    branches.set_column_spacing(8);
    branches.set_row_spacing(8);
    branches.set_halign(gtk::Align::Start);
    branches.set_valign(gtk::Align::Center);

    let mut row_index = 0;
    for child in &node.evolves_to {
        let arrow = evolution_arrow(
            format_trigger(child.trigger.as_deref(), child.trigger_detail.as_deref()),
            false,
        );
        let child_branch =
            evolution_branch(child, alternate_forms, node_ids, current_id, sprite_loader);
        branches.attach(&arrow, 0, row_index, 1, 1);
        branches.attach(&child_branch, 1, row_index, 1, 1);
        row_index += 1;
    }

    for form in forms {
        let arrow = evolution_arrow(
            form_label(&form.name_key).unwrap_or_else(|| "Form".to_owned()),
            true,
        );
        let form_card = evolution_form_card(form, current_id, sprite_loader);
        branches.attach(&arrow, 0, row_index, 1, 1);
        branches.attach(&form_card, 1, row_index, 1, 1);
        row_index += 1;
    }

    branch.append(&branches);
    branch
}

fn evolution_card(node: &EvolutionNode, current_id: i64, sprite_loader: &SpriteLoader) -> gtk::Box {
    let card = gtk::Box::new(gtk::Orientation::Vertical, 4);
    card.add_css_class("evo-card");
    card.set_valign(gtk::Align::Center);
    card.set_halign(gtk::Align::Center);
    if let Some(pokemon_id) = node.pokemon_id {
        card.set_widget_name(&format!("pokemon:{pokemon_id}"));
    }
    if node.pokemon_id == Some(current_id) {
        card.add_css_class("current");
    }
    card.set_width_request(82);
    card.set_height_request(102);

    let sprite = gtk::Image::from_icon_name("image-x-generic-symbolic");
    let sprite_url = node
        .pokemon_id
        .map(|id| pokemon_sprite_url(id, node.sprite_url.as_deref()));
    load_sprite(sprite_loader, &sprite, sprite_url.as_deref(), 54);
    card.append(&sprite_frame(&sprite, 62, "sprite-frame"));

    let name = gtk::Label::new(Some(
        &node
            .name_en
            .as_ref()
            .or(node.name_fr.as_ref())
            .cloned()
            .unwrap_or_else(|| native::titleize_key(&node.name_key)),
    ));
    name.add_css_class("row-title");
    name.set_wrap(true);
    name.set_justify(gtk::Justification::Center);
    card.append(&name);

    card
}

fn evolution_form_card(
    form: &PokemonSummary,
    current_id: i64,
    sprite_loader: &SpriteLoader,
) -> gtk::Box {
    let card = gtk::Box::new(gtk::Orientation::Vertical, 4);
    card.add_css_class("evo-card");
    card.add_css_class("evo-form-card");
    card.set_valign(gtk::Align::Center);
    card.set_halign(gtk::Align::Center);
    card.set_widget_name(&format!("pokemon:{}", form.id));
    if form.id == current_id {
        card.add_css_class("current");
    }
    card.set_width_request(82);
    card.set_height_request(102);

    let sprite = gtk::Image::from_icon_name("image-x-generic-symbolic");
    let sprite_url = pokemon_sprite_url(form.id, form.sprite_url.as_deref());
    load_sprite(sprite_loader, &sprite, Some(&sprite_url), 54);
    card.append(&sprite_frame(&sprite, 62, "sprite-frame"));

    let name = gtk::Label::new(Some(&display_name(form)));
    name.add_css_class("row-title");
    name.set_wrap(true);
    name.set_justify(gtk::Justification::Center);
    card.append(&name);
    card
}

fn evolution_arrow(label_text: String, form_arrow: bool) -> gtk::Box {
    let arrow = gtk::Box::new(gtk::Orientation::Vertical, 3);
    arrow.set_valign(gtk::Align::Center);
    arrow.set_halign(gtk::Align::Center);
    arrow.set_size_request(96, 102);
    let icon = gtk::Image::from_icon_name("go-next-symbolic");
    icon.set_halign(gtk::Align::Center);
    icon.set_margin_top(40);
    if form_arrow {
        icon.add_css_class("stat-spa");
    }
    let label = gtk::Label::new(Some(&label_text));
    label.add_css_class("muted");
    label.set_wrap(true);
    label.set_lines(2);
    label.set_width_chars(12);
    label.set_max_width_chars(12);
    label.set_justify(gtk::Justification::Center);
    label.set_xalign(0.5);
    label.set_width_request(96);
    arrow.append(&icon);
    arrow.append(&label);
    arrow
}

fn forms_for_node<'a>(
    node: &EvolutionNode,
    alternate_forms: &'a [PokemonSummary],
    node_ids: &HashMap<String, i64>,
) -> Vec<&'a PokemonSummary> {
    let Some(node_id) = node.pokemon_id else {
        return Vec::new();
    };

    let mut forms = alternate_forms
        .iter()
        .filter(|form| {
            if form.id == node_id {
                return false;
            }
            if form.species_id == Some(node_id) {
                return true;
            }
            if form.name_key.starts_with(&(node.name_key.clone() + "-")) {
                return true;
            }
            node_ids
                .iter()
                .find(|(_, id)| **id == node_id)
                .is_some_and(|(key, _)| form.name_key.starts_with(&(key.clone() + "-")))
        })
        .collect::<Vec<_>>();

    forms.sort_by_key(|form| form.id);
    forms
}

fn update_pokemon_moves(detail: &DetailWidgets, moves: &[PokemonMoveEntry]) {
    clear_box(&detail.moves);
    detail.moves_section.set_visible(!moves.is_empty());
    if moves.is_empty() {
        return;
    }

    let ordered_methods = ["level-up", "machine", "tutor", "egg"];
    let mut seen: HashSet<String> = HashSet::new();
    let mut methods = Vec::new();
    for method in ordered_methods {
        if moves.iter().any(|move_| move_.learn_method == method) {
            seen.insert(method.to_owned());
            methods.push(method.to_owned());
        }
    }

    let mut others = moves
        .iter()
        .map(|move_| move_.learn_method.as_str())
        .filter(|method| !seen.contains(*method))
        .collect::<Vec<_>>();
    others.sort_unstable();
    others.dedup();
    for method in others {
        methods.push(method.to_owned());
    }

    let tabs = gtk::Box::new(gtk::Orientation::Horizontal, 0);
    tabs.add_css_class("move-tabs");
    tabs.set_halign(gtk::Align::Start);
    let table = gtk::Box::new(gtk::Orientation::Vertical, 0);
    let move_entries = Rc::new(moves.to_vec());
    let mut first_button: Option<gtk::ToggleButton> = None;

    for (idx, method) in methods.iter().enumerate() {
        let button = gtk::ToggleButton::with_label(&learn_method_label(method));
        button.add_css_class("flat");
        button.add_css_class("move-tab");
        if let Some(first) = first_button.as_ref() {
            button.set_group(Some(first));
        } else {
            first_button = Some(button.clone());
        }

        let table_for_click = table.clone();
        let entries_for_click = move_entries.clone();
        let method_for_click = method.clone();
        button.connect_toggled(move |button| {
            if button.is_active() {
                render_move_method_table(
                    &table_for_click,
                    &entries_for_click,
                    method_for_click.as_str(),
                );
            }
        });

        tabs.append(&button);
        if idx == 0 {
            button.set_active(true);
        }
    }

    detail.moves.append(&tabs);
    detail.moves.append(&table);
}

fn render_move_method_table(container: &gtk::Box, moves: &[PokemonMoveEntry], method: &str) {
    clear_box(container);
    container.set_halign(gtk::Align::Fill);
    container.set_hexpand(true);
    container.append(&simple_header(&[
        ("Lv.", 42, false),
        ("Move", 154, true),
        ("Type", 82, false),
        ("Cat.", 54, false),
        ("Pow", 42, false),
        ("Acc", 48, false),
        ("PP", 36, false),
    ]));

    let mut group = moves
        .iter()
        .filter(|move_| move_.learn_method == method)
        .collect::<Vec<_>>();
    if method == "level-up" {
        group.sort_by_key(|move_| (move_.level_learned_at, move_name_from_entry(move_)));
    } else {
        group.sort_by_key(|move_| move_name_from_entry(move_));
    }

    for move_ in group {
        let row = gtk::Box::new(gtk::Orientation::Horizontal, 6);
        row.add_css_class("data-row");
        row.set_widget_name(&format!("move:{}", move_.move_id));
        row.set_halign(gtk::Align::Fill);
        row.set_hexpand(true);
        let level = if method == "level-up" {
            move_.level_learned_at.to_string()
        } else {
            "—".to_owned()
        };
        row.append(&sized_label(&level, 42, false, "dex-id"));
        row.append(&sized_label(
            &move_name_from_entry(move_),
            154,
            true,
            "row-title",
        ));
        let types = gtk::Box::new(gtk::Orientation::Horizontal, 6);
        types.set_width_request(82);
        append_type_pill(&types, move_.type_key.as_deref());
        row.append(&types);
        row.append(&sized_label(
            &move_
                .damage_class
                .as_deref()
                .map(native::titleize_key)
                .unwrap_or_else(|| "—".to_owned()),
            54,
            false,
            "muted",
        ));
        row.append(&sized_label(
            &move_
                .power
                .map(|value| value.to_string())
                .unwrap_or_else(|| "—".to_owned()),
            42,
            false,
            "stat-bst",
        ));
        row.append(&sized_label(
            &move_
                .accuracy
                .map(|value| format!("{value}%"))
                .unwrap_or_else(|| "—".to_owned()),
            48,
            false,
            "stat-bst",
        ));
        row.append(&sized_label(
            &move_
                .pp
                .map(|value| value.to_string())
                .unwrap_or_else(|| "—".to_owned()),
            36,
            false,
            "stat-bst",
        ));
        container.append(&row);
    }
}

fn info_row(icon_name: &str, text: &str) -> gtk::Box {
    let row = gtk::Box::new(gtk::Orientation::Horizontal, 8);
    row.set_margin_top(4);
    row.set_margin_bottom(4);
    let icon = gtk::Image::from_icon_name(icon_name);
    icon.set_pixel_size(14);
    let label = gtk::Label::new(Some(text));
    label.add_css_class("muted");
    label.set_wrap(true);
    label.set_xalign(0.0);
    label.set_hexpand(true);
    row.append(&icon);
    row.append(&label);
    row
}

fn move_name_from_entry(move_: &PokemonMoveEntry) -> String {
    move_
        .name_fr
        .as_ref()
        .or(move_.name_en.as_ref())
        .cloned()
        .or(move_.name_key.as_ref().map(|key| native::titleize_key(key)))
        .unwrap_or_else(|| "Unknown Move".to_owned())
}

fn learn_method_label(method: &str) -> String {
    match method {
        "level-up" => "Level Up".to_owned(),
        "machine" => "TM/HM".to_owned(),
        "tutor" => "Tutor".to_owned(),
        "egg" => "Egg".to_owned(),
        other => native::titleize_key(other),
    }
}

fn format_trigger(trigger: Option<&str>, detail: Option<&str>) -> String {
    match trigger.unwrap_or_default() {
        "level-up" => detail.unwrap_or("Level up").to_owned(),
        "use-item" => detail.unwrap_or("Item").to_owned(),
        "trade" => detail
            .map(|detail| format!("Trade ({detail})"))
            .unwrap_or_else(|| "Trade".to_owned()),
        "shed" => "Shedinja".to_owned(),
        "" => String::new(),
        other => detail
            .map(ToOwned::to_owned)
            .unwrap_or_else(|| native::titleize_key(other)),
    }
}

fn factor_label(factor: i32) -> String {
    if factor == 0 {
        return "0x".to_owned();
    }
    if factor % 100 == 0 {
        return format!("{}x", factor / 100);
    }
    let value = factor as f64 / 100.0;
    if factor % 25 == 0 {
        let mut text = format!("{value:.2}");
        while text.ends_with('0') {
            text.pop();
        }
        if text.ends_with('.') {
            text.pop();
        }
        format!("{text}x")
    } else {
        format!("{value:.2}x")
    }
}

fn matchup_ability(abilities: &[PokemonAbility]) -> Option<&str> {
    abilities
        .iter()
        .find(|ability| ability.is_hidden != 1 && ability_has_matchup_effect(&ability.ability_key))
        .or_else(|| {
            abilities
                .iter()
                .find(|ability| ability_has_matchup_effect(&ability.ability_key))
        })
        .map(|ability| ability.ability_key.as_str())
}

fn ability_has_matchup_effect(key: &str) -> bool {
    matches!(
        key,
        "levitate"
            | "flash-fire"
            | "water-absorb"
            | "volt-absorb"
            | "lightning-rod"
            | "motor-drive"
            | "sap-sipper"
            | "storm-drain"
            | "well-baked-body"
            | "earth-eater"
            | "dry-skin"
            | "thick-fat"
            | "heatproof"
            | "water-bubble"
            | "purifying-salt"
            | "wonder-guard"
            | "filter"
            | "solid-rock"
            | "prism-armor"
    )
}

fn defensive_buckets(
    type1: &str,
    type2: Option<&str>,
    ability_key: Option<&str>,
) -> BTreeMap<i32, Vec<&'static str>> {
    let mut buckets: BTreeMap<i32, Vec<&'static str>> = BTreeMap::new();
    for attacking in ALL_TYPES {
        let base = dual_type_factor(attacking, type1, type2);
        let adjusted = ability_key
            .map(|ability| apply_ability_factor(base, attacking, ability))
            .unwrap_or(base);
        let key = (adjusted * 100.0).round() as i32;
        buckets.entry(key).or_default().push(*attacking);
    }
    buckets
}

fn dual_type_factor(attacking: &str, type1: &str, type2: Option<&str>) -> f64 {
    type_factor(attacking, type1)
        * type2
            .map(|type2| type_factor(attacking, type2))
            .unwrap_or(1.0)
}

fn apply_ability_factor(base: f64, attacking: &str, ability: &str) -> f64 {
    match ability {
        "levitate" if attacking == "ground" => 0.0,
        "flash-fire" if attacking == "fire" => 0.0,
        "water-absorb" | "storm-drain" if attacking == "water" => 0.0,
        "volt-absorb" | "lightning-rod" | "motor-drive" if attacking == "electric" => 0.0,
        "sap-sipper" if attacking == "grass" => 0.0,
        "well-baked-body" if attacking == "fire" => 0.0,
        "earth-eater" if attacking == "ground" => 0.0,
        "dry-skin" if attacking == "water" => 0.0,
        "dry-skin" if attacking == "fire" => base * 1.25,
        "thick-fat" if attacking == "fire" || attacking == "ice" => base * 0.5,
        "heatproof" | "water-bubble" if attacking == "fire" => base * 0.5,
        "purifying-salt" if attacking == "ghost" => base * 0.5,
        "wonder-guard" if base <= 1.0 => 0.0,
        "filter" | "solid-rock" | "prism-armor" if base > 1.0 => base * 0.75,
        _ => base,
    }
}

fn type_factor(attacking: &str, defending: &str) -> f64 {
    match attacking {
        "normal" => match defending {
            "rock" | "steel" => 0.5,
            "ghost" => 0.0,
            _ => 1.0,
        },
        "fire" => match defending {
            "grass" | "ice" | "bug" | "steel" => 2.0,
            "fire" | "water" | "rock" | "dragon" => 0.5,
            _ => 1.0,
        },
        "water" => match defending {
            "fire" | "ground" | "rock" => 2.0,
            "water" | "grass" | "dragon" => 0.5,
            _ => 1.0,
        },
        "electric" => match defending {
            "water" | "flying" => 2.0,
            "electric" | "grass" | "dragon" => 0.5,
            "ground" => 0.0,
            _ => 1.0,
        },
        "grass" => match defending {
            "water" | "ground" | "rock" => 2.0,
            "fire" | "grass" | "poison" | "flying" | "bug" | "dragon" | "steel" => 0.5,
            _ => 1.0,
        },
        "ice" => match defending {
            "grass" | "ground" | "flying" | "dragon" => 2.0,
            "fire" | "water" | "ice" | "steel" => 0.5,
            _ => 1.0,
        },
        "fighting" => match defending {
            "normal" | "ice" | "rock" | "dark" | "steel" => 2.0,
            "poison" | "flying" | "psychic" | "bug" | "fairy" => 0.5,
            "ghost" => 0.0,
            _ => 1.0,
        },
        "poison" => match defending {
            "grass" | "fairy" => 2.0,
            "poison" | "ground" | "rock" | "ghost" => 0.5,
            "steel" => 0.0,
            _ => 1.0,
        },
        "ground" => match defending {
            "fire" | "electric" | "poison" | "rock" | "steel" => 2.0,
            "grass" | "bug" => 0.5,
            "flying" => 0.0,
            _ => 1.0,
        },
        "flying" => match defending {
            "grass" | "fighting" | "bug" => 2.0,
            "electric" | "rock" | "steel" => 0.5,
            _ => 1.0,
        },
        "psychic" => match defending {
            "fighting" | "poison" => 2.0,
            "psychic" | "steel" => 0.5,
            "dark" => 0.0,
            _ => 1.0,
        },
        "bug" => match defending {
            "grass" | "psychic" | "dark" => 2.0,
            "fire" | "fighting" | "poison" | "flying" | "ghost" | "steel" | "fairy" => 0.5,
            _ => 1.0,
        },
        "rock" => match defending {
            "fire" | "ice" | "flying" | "bug" => 2.0,
            "fighting" | "ground" | "steel" => 0.5,
            _ => 1.0,
        },
        "ghost" => match defending {
            "psychic" | "ghost" => 2.0,
            "dark" => 0.5,
            "normal" => 0.0,
            _ => 1.0,
        },
        "dragon" => match defending {
            "dragon" => 2.0,
            "steel" => 0.5,
            "fairy" => 0.0,
            _ => 1.0,
        },
        "dark" => match defending {
            "psychic" | "ghost" => 2.0,
            "fighting" | "dark" | "fairy" => 0.5,
            _ => 1.0,
        },
        "steel" => match defending {
            "ice" | "rock" | "fairy" => 2.0,
            "fire" | "water" | "electric" | "steel" => 0.5,
            _ => 1.0,
        },
        "fairy" => match defending {
            "fighting" | "dragon" | "dark" => 2.0,
            "fire" | "poison" | "steel" => 0.5,
            _ => 1.0,
        },
        _ => 1.0,
    }
}

fn pokemon_row_string(pokemon: &PokemonSummary) -> String {
    let base_id = pokemon.species_id.unwrap_or(pokemon.id);
    let form = if base_id == pokemon.id {
        String::new()
    } else {
        format!("· {}", form_name(pokemon))
    };
    let stats = [
        pokemon.hp,
        pokemon.atk,
        pokemon.def,
        pokemon.spa,
        pokemon.spd,
        pokemon.spe,
        pokemon.base_stat_total,
    ]
    .iter()
    .map(|value| {
        value
            .map(|value| value.to_string())
            .unwrap_or_else(|| "-".to_owned())
    })
    .collect::<Vec<_>>();

    format!(
        "{}\t{base_id:03}\t{}\t{}\t{}\t{}\t{}\t{}",
        pokemon.sprite_url.as_deref().unwrap_or_default(),
        display_name(pokemon),
        form,
        pokemon.type1_key.as_deref().unwrap_or_default(),
        pokemon.type2_key.as_deref().unwrap_or_default(),
        stats.join("\t"),
        pokemon.id,
    )
}

fn move_row_string(move_: &MoveSummary) -> String {
    format!(
        "{}\t{}\t{}\t{}\t{}\t{}\t{}",
        native::move_name(move_),
        move_.type_key.as_deref().unwrap_or_default(),
        move_
            .damage_class
            .as_deref()
            .map(native::titleize_key)
            .unwrap_or_else(|| "-".to_owned()),
        move_
            .power
            .map(|v| v.to_string())
            .unwrap_or_else(|| "-".to_owned()),
        move_
            .accuracy
            .map(|v| format!("{v}%"))
            .unwrap_or_else(|| "-".to_owned()),
        move_
            .pp
            .map(|v| v.to_string())
            .unwrap_or_else(|| "-".to_owned()),
        move_.id,
    )
}

fn item_row_string(item: &ItemSummary) -> String {
    format!(
        "{}\t{}\t{}\t{}",
        native::item_name(item),
        item.category.as_deref().unwrap_or("-"),
        item.effect_fr
            .as_deref()
            .or(item.effect_en.as_deref())
            .unwrap_or(""),
        item.id,
    )
}

fn nature_row_string(nature: &NatureSummary) -> String {
    format!(
        "{}\t{}\t{}\t{}\t{}",
        native::nature_name(nature),
        stat_label(nature.increased_stat.as_deref()),
        stat_label(nature.decreased_stat.as_deref()),
        nature.likes_flavor.as_deref().unwrap_or("--"),
        nature.hates_flavor.as_deref().unwrap_or("--"),
    )
}

fn form_name(pokemon: &PokemonSummary) -> String {
    let base_name = display_name(pokemon).to_lowercase().replace(' ', "-");
    let key = pokemon.name_key.replace(&base_name, "");
    let cleaned = key.trim_matches('-').trim();
    if cleaned.is_empty() {
        native::titleize_key(&pokemon.name_key)
    } else {
        native::titleize_key(cleaned)
    }
}

fn form_label(name_key: &str) -> Option<String> {
    let label = name_key
        .split('-')
        .rev()
        .take_while(|part| !matches!(*part, "charizard" | "venusaur" | "blastoise"))
        .collect::<Vec<_>>();
    if name_key.contains("-mega-x") {
        Some("Mega X".to_owned())
    } else if name_key.contains("-mega-y") {
        Some("Mega Y".to_owned())
    } else if name_key.contains("-mega") {
        Some("Mega".to_owned())
    } else if name_key.contains("-gmax") {
        Some("Gigantamax".to_owned())
    } else if name_key.contains("-alola") {
        Some("Alola".to_owned())
    } else if name_key.contains("-galar") {
        Some("Galar".to_owned())
    } else if name_key.contains("-hisui") {
        Some("Hisui".to_owned())
    } else if name_key.contains("-paldea") {
        Some("Paldea".to_owned())
    } else if label.is_empty() {
        None
    } else {
        let label = label.into_iter().rev().collect::<Vec<_>>().join("-");
        (!label.is_empty()).then(|| native::titleize_key(&label))
    }
}

fn display_name(pokemon: &PokemonSummary) -> String {
    pokemon
        .name_en
        .as_ref()
        .or(pokemon.name_fr.as_ref())
        .cloned()
        .unwrap_or_else(|| native::titleize_key(&pokemon.name_key))
}

fn detail_display_name(pokemon: &PokemonDetail) -> String {
    pokemon
        .name_en
        .as_ref()
        .or(pokemon.name_fr.as_ref())
        .cloned()
        .unwrap_or_else(|| native::titleize_key(&pokemon.name_key))
}

fn move_detail_name(move_: &MoveDetail) -> String {
    move_
        .name_fr
        .as_ref()
        .or(move_.name_en.as_ref())
        .cloned()
        .unwrap_or_else(|| native::titleize_key(&move_.name_key))
}

fn ability_detail_name(ability: &AbilityDetail) -> String {
    ability
        .name_fr
        .as_ref()
        .or(ability.name_en.as_ref())
        .cloned()
        .unwrap_or_else(|| native::titleize_key(&ability.name_key))
}

fn item_detail_name(item: &ItemDetail) -> String {
    item.name_fr
        .as_ref()
        .or(item.name_en.as_ref())
        .cloned()
        .unwrap_or_else(|| native::titleize_key(&item.name_key))
}

fn pokemon_stat_value(pokemon: &PokemonSummary, key: &str) -> String {
    let value = match key {
        "hp" => pokemon.hp,
        "atk" => pokemon.atk,
        "def" => pokemon.def,
        "spa" => pokemon.spa,
        "spd" => pokemon.spd,
        "spe" => pokemon.spe,
        "bst" => pokemon.base_stat_total,
        _ => None,
    };
    value
        .map(|v| v.to_string())
        .unwrap_or_else(|| "-".to_owned())
}

fn stat_label(value: Option<&str>) -> String {
    match value.unwrap_or_default() {
        "attack" => "Attack".to_owned(),
        "defense" => "Defense".to_owned(),
        "special-attack" => "Sp. Atk".to_owned(),
        "special-defense" => "Sp. Def".to_owned(),
        "speed" => "Speed".to_owned(),
        "" => "--".to_owned(),
        other => native::titleize_key(other),
    }
}

fn append_type_pill(container: &gtk::Box, type_key: Option<&str>) {
    let Some(type_key) = type_key else {
        return;
    };
    if type_key.is_empty() {
        return;
    }
    container.append(&type_pill(type_key));
}

fn type_pill(type_key: &str) -> gtk::Label {
    let pill = gtk::Label::new(Some(&native::titleize_key(type_key)));
    pill.add_css_class("type-pill");
    pill.add_css_class(&format!("type-{type_key}"));
    pill.set_valign(gtk::Align::Center);
    pill.set_halign(gtk::Align::Start);
    pill
}

fn metric(text: &str) -> gtk::Label {
    let label = gtk::Label::new(Some(text));
    label.add_css_class("metric-pill");
    label
}

fn compare_label(text: &str, muted: bool) -> gtk::Label {
    let label = gtk::Label::new(Some(text));
    label.set_xalign(0.0);
    label.set_margin_start(16);
    label.set_margin_end(16);
    label.set_margin_top(8);
    label.set_margin_bottom(8);
    if muted {
        label.add_css_class("muted");
    }
    label
}

fn parse_fields(value: &str) -> Vec<String> {
    value.split('\t').map(ToOwned::to_owned).collect()
}

fn field(fields: &[String], index: usize) -> &str {
    fields.get(index).map(String::as_str).unwrap_or("")
}

fn optional_field(value: &str) -> Option<&str> {
    let value = value.trim();
    (!value.is_empty()).then_some(value)
}

fn set_label<W: IsA<gtk::Widget>>(container: &W, index: usize, value: &str) {
    if let Some(label) = nth_child(container, index).and_downcast::<gtk::Label>() {
        label.set_text(value);
    }
}

fn nth_child<W: IsA<gtk::Widget>>(widget: &W, index: usize) -> Option<gtk::Widget> {
    let mut child = widget.as_ref().first_child();
    for _ in 0..index {
        child = child?.next_sibling();
    }
    child
}

fn clear_box(container: &gtk::Box) {
    while let Some(child) = container.first_child() {
        container.remove(&child);
    }
}

fn clear_flow_box(container: &gtk::FlowBox) {
    while let Some(child) = container.first_child() {
        container.remove(&child);
    }
}

fn text_matches(query: &str, fields: &[&str]) -> bool {
    let query = query.trim().to_lowercase();
    if query.is_empty() {
        return true;
    }

    let haystack = fields.join(" ").to_lowercase();
    query
        .split_whitespace()
        .all(|token| haystack.contains(token))
}

fn show_startup_error(app: &adw::Application, message: &str) {
    let window = adw::ApplicationWindow::builder()
        .application(app)
        .title("Pokedia")
        .default_width(720)
        .default_height(420)
        .build();

    let toolbar = adw::ToolbarView::new();
    toolbar.add_top_bar(&adw::HeaderBar::new());
    let status = adw::StatusPage::builder()
        .icon_name("dialog-error-symbolic")
        .title("Pokedia failed to start")
        .description(message)
        .build();
    toolbar.set_content(Some(&status));
    window.set_content(Some(&toolbar));
    window.present();
}
