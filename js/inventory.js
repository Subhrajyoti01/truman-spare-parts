(() => {
 const U=window.TrumanUtils;
 const fields=[
  {name:'sku',label:'SKU / Part number',required:true},{name:'name',label:'Part name',required:true},
  {name:'description',label:'Description',type:'textarea',span:true},{name:'category',label:'Category'},
  {name:'current_stock',label:'Opening stock',type:'number',min:0,step:1,required:true,value:0},
  {name:'unit_cost',label:'Unit cost (INR)',type:'number',min:0,step:.01,required:true,value:0},
  {name:'bin_location',label:'Bin / storage location'},{name:'supplier_name',label:'Supplier name'},
  {name:'supplier_contact',label:'Supplier contact'},
  {name:'avg_daily_demand',label:'Average daily demand (units/day)',type:'number',min:0,step:.01,value:0,required:true},
  {name:'lead_time_days',label:'Supplier lead time (calendar days)',type:'number',min:0,step:1,value:0,required:true},
  {name:'safety_stock',label:'Safety stock (units)',type:'number',min:0,step:1,value:0,required:true},
  {name:'abc_class',label:'ABC class',type:'select',options:[{value:'A',label:'A — high value'},{value:'B',label:'B — medium value'},{value:'C',label:'C — lower value'}],value:'C'},
  {name:'xyz_class',label:'XYZ class',type:'select',options:[{value:'X',label:'X — stable'},{value:'Y',label:'Y — variable'},{value:'Z',label:'Z — irregular'}],value:'Z'},
  {name:'minimum_order_qty',label:'Minimum order quantity',type:'number',min:0,step:1,value:0},
  {name:'target_stock_level',label:'Target stock level (optional)',type:'number',min:0,step:1},
  {name:'manufacturer_reference',label:'Manufacturer reference'}
 ];
 window.TrumanInventory={
  fields,
  render:async()=>{
   const rows=await U.rows('parts',{order:'name'}); window.TrumanApp.cache.parts=rows;
   const q=U.$('#inventory-search')?.value?.toLowerCase()||'',abc=U.$('#inventory-abc')?.value||'',xyz=U.$('#inventory-xyz')?.value||'';
   const filtered=rows.filter(p=>(!q||[p.name,p.sku,p.category,p.supplier_name].some(x=>String(x||'').toLowerCase().includes(q)))&&(!abc||p.abc_class===abc)&&(!xyz||p.xyz_class===xyz));
   U.$('#page-content').innerHTML=`<div class="page-heading"><div><h2>Inventory master</h2><p>Part records, demand parameters and live reorder status.</p></div><div class="inline-actions"><button class="btn" id="export-inventory">Export CSV</button><button class="btn" id="batch-labels">Barcode batch</button><button class="btn primary" id="add-part">+ Add part</button></div></div><div class="panel"><div class="toolbar"><input id="inventory-search" placeholder="Search SKU, part, supplier…" value="${U.escape(q)}"><select id="inventory-abc"><option value="">All ABC classes</option>${['A','B','C'].map(x=>`<option ${abc===x?'selected':''}>${x}</option>`).join('')}</select><select id="inventory-xyz"><option value="">All XYZ classes</option>${['X','Y','Z'].map(x=>`<option ${xyz===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="table-wrap"><table><thead><tr><th>Part / SKU</th><th>Stock</th><th>Reorder point</th><th>ABC-XYZ</th><th>Unit cost</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead><tbody>${filtered.map(p=>`<tr><td><strong>${U.escape(p.name)}</strong><br><span class="muted">${U.escape(p.sku)}</span></td><td>${p.current_stock}</td><td>${U.reorderPoint(p)}</td><td>${p.abc_class||'—'}${p.xyz_class||'—'}</td><td>${U.money(p.unit_cost)}</td><td>${U.escape(p.bin_location||'—')}</td><td>${U.reorderNeeded(p)?'<span class="pill red">REORDER REQUIRED</span>':'<span class="pill green">In range</span>'}</td><td><div class="inline-actions"><button class="btn small" data-edit-part="${p.id}">Edit</button><button class="btn small" data-label-part="${p.id}">Label</button><button class="btn small" data-queue-part="${p.id}">+ Batch</button>${window.TrumanApp.role==='workshop_admin'?`<button class="btn small danger" data-delete-part="${p.id}">Delete</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="8" class="empty">No matching parts found.</td></tr>'}</tbody></table></div><div class="pagination"><span>${filtered.length} of ${rows.length} parts</span><span>Stock changes must use receipts, issues or controlled adjustments.</span></div></div>`;
   U.$('#add-part').onclick=()=>window.TrumanInventory.edit(); U.$('#export-inventory').onclick=()=>U.csv('truman-inventory.csv',filtered); U.$('#batch-labels').onclick=()=>window.TrumanBarcode.batch();
   U.$('#inventory-search').oninput=()=>window.TrumanInventory.render();U.$('#inventory-abc').onchange=()=>window.TrumanInventory.render();U.$('#inventory-xyz').onchange=()=>window.TrumanInventory.render();
   U.$$('[data-edit-part]').forEach(b=>b.onclick=()=>window.TrumanInventory.edit(rows.find(p=>p.id===b.dataset.editPart)));
   U.$$('[data-label-part]').forEach(b=>b.onclick=()=>window.TrumanBarcode.label(rows.find(p=>p.id===b.dataset.labelPart))); U.$$('[data-queue-part]').forEach(b=>b.onclick=()=>window.TrumanBarcode.queue(rows.find(p=>p.id===b.dataset.queuePart))); U.$$('[data-delete-part]').forEach(b=>b.onclick=async()=>{const p=rows.find(x=>x.id===b.dataset.deletePart);if(!U.confirm(`Delete ${p?.sku} — ${p?.name}?`))return;try{await U.call('admin_delete_part',{p_part_id:p.id});U.toast('Part deleted.','success');await window.TrumanInventory.render()}catch(e){U.toast(U.err(e),'error')}});
  },
  edit:async (part,onSaved)=>{
   const f=U.form(fields,part||{});
   if(part){f.elements.current_stock.disabled=true;f.elements.current_stock.title='Use stock receipt or adjustment workflow to change stock.';}
   f.onsubmit=async e=>{
    e.preventDefault();const b=f.querySelector('[type=submit]');b.disabled=true;const d=Object.fromEntries(new FormData(f));
    for(const k of ['current_stock','unit_cost','avg_daily_demand','lead_time_days','safety_stock','minimum_order_qty','target_stock_level'])d[k]=d[k]===''?null:Number(d[k]);
    d.sku=d.sku.trim();d.name=d.name.trim();
    try{
     if(part){delete d.current_stock;const {error}=await window.sb.rpc('update_part_details',{p_part_id:part.id,p_sku:d.sku,p_name:d.name,p_description:d.description||null,p_category:d.category||null,p_unit_cost:d.unit_cost,p_bin_location:d.bin_location||null,p_supplier_name:d.supplier_name||null,p_supplier_contact:d.supplier_contact||null,p_avg_daily_demand:d.avg_daily_demand,p_lead_time_days:d.lead_time_days,p_safety_stock:d.safety_stock,p_abc_class:d.abc_class,p_xyz_class:d.xyz_class,p_minimum_order_qty:d.minimum_order_qty,p_target_stock_level:d.target_stock_level,p_manufacturer_reference:d.manufacturer_reference||null});if(error)throw error;U.toast('Part details updated.','success');}
     else{const {error}=await window.sb.rpc('create_part',{p_sku:d.sku,p_name:d.name,p_description:d.description||null,p_category:d.category||null,p_opening_stock:d.current_stock,p_unit_cost:d.unit_cost,p_bin_location:d.bin_location||null,p_supplier_name:d.supplier_name||null,p_supplier_contact:d.supplier_contact||null,p_avg_daily_demand:d.avg_daily_demand,p_lead_time_days:d.lead_time_days,p_safety_stock:d.safety_stock,p_abc_class:d.abc_class,p_xyz_class:d.xyz_class,p_minimum_order_qty:d.minimum_order_qty,p_target_stock_level:d.target_stock_level,p_manufacturer_reference:d.manufacturer_reference||null});if(error)throw error;U.toast('Part created.','success');}
     U.$('#app-dialog').close();if(onSaved){await onSaved();}else{await window.TrumanInventory.render();}
    }catch(e){U.$('#dynamic-message').textContent=U.err(e);}finally{b.disabled=false;}
   };
  }
 };
})();
