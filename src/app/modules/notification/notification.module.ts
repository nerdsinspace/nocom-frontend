import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationComponent } from '../../components/notification/notification.component';

@NgModule({
  declarations: [NotificationComponent],
  imports: [
    CommonModule
  ],
  exports: [
    NotificationComponent
  ]
})
export class NotificationModule {
}
