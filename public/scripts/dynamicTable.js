 window.onload = function() {

     var ws = new WebSocket('wss://' + window.location.hostname + window.location.pathname + window.location.search);
     ws.addEventListener('message', function(e) {
         var data = JSON.parse(e.data);

         switch (data.type) {
             case 'lobby':
                 towerProcessing(data.towerInstances);
                 break;
             case 'score':
                 var tableQuery = '#scores tbody';
                 var content = data.docs;
                 dynamicTable(tableQuery, content);
                 break;
         }
     });
 };

 function dynamicTable(tableQuery, data) {
     var table = document.querySelector(tableQuery);
     table.innerHTML = "";
     for (var elm of data) {
         var tr = document.createElement('tr');
         for (var key in elm) {
             var td = document.createElement('td');
             td.appendChild(document.createTextNode(elm[key]));
             tr.appendChild(td);
         }
         table.appendChild(tr);
     }
 }

 function towerProcessing(towerInstances) {
     var roomsForms = document.querySelector('#rooms_forms');
     roomsForms.innerHTML = "";
     var rooms = document.querySelector('#rooms tbody');
     rooms.innerHTML = "";

     var names = ['room', 'length', 'layer'];

     for (var key in towerInstances) {
         var values = [key, towerInstances[key].lengthSide, towerInstances[key].layer];

         var form = document.createElement('form');
         form.className = "form-signin";
         form.setAttribute('action', '/game');
         form.setAttribute('method', '');
         form.setAttribute('id', 'form_' + key);

         roomsForms.appendChild(form);
         var tr = document.createElement('tr');
         var td;

         for (var i = 0; i < names.length; i++) {

             var input = document.createElement('input');
             input.className = "form-control";
             input.setAttribute('type', 'text');
             input.setAttribute('name', names[i]);
             input.setAttribute('value', values[i]);
             input.setAttribute('readonly', '');
             input.setAttribute('form', 'form_' + key);

             td = document.createElement('td');
             td.appendChild(input);
             tr.appendChild(td);

         }

         var button = document.createElement('input');
         button.className = "btn btn-primary";
         button.setAttribute('type', 'submit');
         button.setAttribute('value', 'Rejoindre la partie');
         button.setAttribute('form', 'form_' + key);

         td = document.createElement('td');
         td.appendChild(button);
         tr.appendChild(td);

         rooms.appendChild(tr);
     }
 }
 