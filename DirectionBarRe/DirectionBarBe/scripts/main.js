import * as Ui from "mojang-minecraft-ui";
import { world, Vector, Location, ItemStack, MinecraftItemTypes } from "mojang-minecraft";

function showMarkerForm(dim, player, item_stack, pos){
  const item_lores = item_stack.getLore();
  let marker_name = "1";
  let lore_data = analyzeLore(item_lores);
  let current_slot =  player.selectedSlot;
  let modalFormData = new Ui.ModalFormData().title("マーカー");

  if(lore_data != null){
    marker_name = lore_data.name;
    modalFormData = modalFormData.toggle("マーカーを削除", false)
                                 .toggle("名前のみ変更", false);  
  }
  modalFormData
  .textField("マーカーの名前", "", marker_name)
  .show(player)
  .then((res) => {
    if(!res.isCanceled){
      let del  = false; 
      let only_name = false;
      let name = "";
      let inventory = player.getComponent("inventory").container;
      let residual_item_stack = new ItemStack(MinecraftItemTypes.compass, item_stack.amount-1, item_stack.data);
      let new_item_stack = new ItemStack(MinecraftItemTypes.compass, 1, item_stack.data);
      if(lore_data != null){
        del = res.formValues[0];
        only_name = res.formValues[1];
        name = res.formValues[2];
      } else {
        name = res.formValues[0];
      }
      if(del){
        let lores = item_lores.filter((lore, index) => {
          return index != lore_data.index;
        });
        new_item_stack.setLore(lores);
        inventory.setItem(current_slot, residual_item_stack);
        inventory.addItem(new_item_stack);
        dim.runCommand("say マーカーを削除しました。");
      } else {
        let new_lore_data = "";
        let message = "";
        if(only_name){
          new_lore_data = createLoreData(name, lore_data.pos);
          message = "マーカー名を" + name + " に変更しました。";
        } else {
          new_lore_data = createLoreData(name, [pos.x, pos.z]);
          message = "マーカー:" + name + " を設定しました。";
        }
        //アイテムのLoreが何もないか、これ以外に他になかったら
        if(lore_data == null && item_lores.length == 0 || (lore_data != null && item_lores.length == 1)){
          new_item_stack.setLore([new_lore_data]);
        } else if(lore_data == null){  //未設定かつ他にLoreがあるなら
          let new_lores = item_lores.concat([new_lore_data]);
          new_item_stack.setLore(new_lores);
        } else {
          let new_lores = item_lores.reduce((new_lores, current_lore, index)=>{
            if(lore_data.index == index)
              new_lores[index] = new_lore_data;
            else 
              new_lores[index] = current_lore;
            return new_lores;
          }, []);
          new_item_stack.setLore(new_lores);
        }
        inventory.setItem(current_slot, residual_item_stack);
        inventory.addItem(new_item_stack);
        dim.runCommand("say " + message);
      }
    }
  }, () => {
    dim.runCommand("say タイムアウトしました。");
  });
}


world.events.itemUse.subscribe(event => {
  try{
    let entity = event.source;
    
    let dim = entity.dimension;
    let pos = entity.location;
    if(entity.id == "minecraft:player"){
      if(event.item.id == "minecraft:compass"){
        const players = world.getPlayers();
        for(const player of players){
          /*
          if(event.item.id == "minecraft:stick"){
          let new_item_stack = new ItemStack(MinecraftItemTypes.compass);
          let new_lores = ["test1"].concat(entity.getComponent("inventory").container.getItem(0).getLore());
          new_item_stack.setLore(new_lores.concat(["test2"]));
          entity.getComponent("inventory").container.setItem(0, new_item_stack);
          }
          */      
          if(entity == player){
            showMarkerForm(dim, player, event.item, pos);
            break;
          }
        }
      }
    }
  } catch(error){
    console.error(error);
  }
});

world.events.tick.subscribe(event => {
  try{
    const players = world.getPlayers();
    for(const player of players){
      const inventry = player.getComponent("inventory").container;
      const item_stack = inventry.getItem(player.selectedSlot);
      if(item_stack != null && item_stack.id == "minecraft:compass"){
        let lore_data = analyzeLore(item_stack.getLore());
        if(lore_data != null){
          let marker_pos = new Location(lore_data.pos[0], 0.0, lore_data.pos[1]);
          //let body_rad = player.bodyRotation*Math.PI/180;
          let z_vec = new Vector(0.0, 0.0, 1.0);
          let marker_vec = new Vector(marker_pos.x-player.location.x, 0.0, marker_pos.z-player.location.z).normalized();
          let multiply = Vector.multiply(z_vec, marker_vec);
          let cross = Vector.cross(z_vec, marker_vec);
          let marker_direction = -Math.sign(cross.y) *  Math.round(Math.acos( (multiply.x + multiply.z) ) * 180/Math.PI );
          player.triggerEvent("marker_direction_" + String(marker_direction));

          //let body_rotation = player.bodyRotation;
          //let dim = player.dimension;
          //dim.runCommand("say view: [" + String(view_vec.x) + ", " + String(view_vec.y) + ", " + String(view_vec.z));// + ", body: " + String(body_rotation));
        } else {
          player.triggerEvent("no_marker");
        }
      } else {
        player.triggerEvent("no_marker");
      }
    }
  } catch(error){
    console.error(error);
  }
});

function analyzeLore(lores){
  const id = "Direction Bar: §2§9§e§7§1§9§6§9§-§3§d§d§1§-§4§7§b§0§-§8§d§6§9§-§9§b§4§b§3§4§6§1§b§5§f§b";
  let data = null;
  for(let i = 0; i < lores.length; i++){
    if(lores[i].substr(0, id.length) == id){
      data = JSON.parse(lores[i].substring(id.length).replaceAll('§', ''));
      data.index = i;
      break;
    }
  }
  return data;
}

function createLoreData(name, pos){
  let data = "Direction Bar: §2§9§e§7§1§9§6§9§-§3§d§d§1§-§4§7§b§0§-§8§d§6§9§-§9§b§4§b§3§4§6§1§b§5§f§b";
  data += "§{§\"§n§a§m§e§\"§:§\""+name;
  let str = "\",\"pos\":["+pos[0]+","+pos[1]+"]}";
  for(let c of str){
    data += "§" + c;
  }
  return data;
}