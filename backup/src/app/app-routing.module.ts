import { NgModule } from '@angular/core'
import { Routes } from '@angular/router'
import { NativeScriptRouterModule } from '@nativescript/angular'

import { RemoteControlComponent } from './remote/remote-control.component'

const routes: Routes = [
  { path: '', redirectTo: '/remote', pathMatch: 'full' },
  { path: 'remote', component: RemoteControlComponent },
]

@NgModule({
  imports: [NativeScriptRouterModule.forRoot(routes)],
  exports: [NativeScriptRouterModule],
})
export class AppRoutingModule {}