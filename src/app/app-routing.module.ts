import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = []

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'top',
      anchorScrolling: 'enabled',
      onSameUrlNavigation: 'reload',
      // enableTracing: true, // uncomment to debug router events
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}