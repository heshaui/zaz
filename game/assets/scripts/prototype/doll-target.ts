import { _decorator, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('DollTarget')
export class DollTarget extends Component {
  @property
  dollId = 'ordinary-doll';

  @property
  displayColor = '#F4A6B8';
}
